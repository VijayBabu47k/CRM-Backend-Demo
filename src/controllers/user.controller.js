const UserModel = require('../models/user.model');
const ActivityModel = require('../models/activity.model');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// Get all users with pagination and search
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, role, sortBy, sortOrder } = req.query;
  
  const result = await UserModel.findAll({
    page: parseInt(page),
    limit: parseInt(limit),
    search,
    status,
    role,
    sortBy,
    sortOrder
  });
  
  // Transform user data
  const users = result.users.map(user => ({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatar_url,
    phone: user.phone,
    department: user.department,
    lastLogin: user.last_login,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }));
  
  res.json({
    success: true,
    data: {
      users,
      pagination: result.pagination
    }
  });
});

// Get single user by ID
exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findById(req.params.id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatar_url,
        phone: user.phone,
        department: user.department,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    }
  });
});

// Create new user (admin only)
exports.createUser = asyncHandler(async (req, res, next) => {
  const { email, password, firstName, lastName, role, status, phone, department } = req.body;
  
  // Check if user already exists
  const existingUser = await UserModel.findByEmail(email);
  if (existingUser) {
    return next(new AppError('User with this email already exists', 400));
  }
  
  // Create user
  const user = await UserModel.create({
    email,
    password,
    firstName,
    lastName,
    role,
    status,
    phone,
    department
  });
  
  // Create activity
  await ActivityModel.create({
    userId: req.user.id,
    type: 'user_created',
    description: `Admin created new user: ${firstName} ${lastName}`,
    metadata: { createdUserId: user.id }
  });
  
  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('user:created', {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      message: `New user created: ${firstName} ${lastName}`,
      createdBy: `${req.user.first_name} ${req.user.last_name}`
    });
  }
  
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status,
        department: user.department,
        createdAt: user.created_at
      }
    }
  });
});

// Update user (admin only)
exports.updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { firstName, lastName, role, status, phone, department, avatarUrl } = req.body;
  
  // Check if user exists
  const existingUser = await UserModel.findById(id);
  if (!existingUser) {
    return next(new AppError('User not found', 404));
  }
  
  // Update user
  const updatedUser = await UserModel.update(id, {
    firstName,
    lastName,
    role,
    status,
    phone,
    department,
    avatarUrl
  });
  
  // Create activity
  await ActivityModel.create({
    userId: req.user.id,
    type: 'user_updated',
    description: `Admin updated user: ${updatedUser.first_name} ${updatedUser.last_name}`,
    metadata: { updatedUserId: id }
  });
  
  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('user:updated', {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        status: updatedUser.status
      },
      message: `User updated: ${updatedUser.first_name} ${updatedUser.last_name}`
    });
  }
  
  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        status: updatedUser.status,
        avatarUrl: updatedUser.avatar_url,
        phone: updatedUser.phone,
        department: updatedUser.department,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at
      }
    }
  });
});

// Delete user (admin only)
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  
  // Check if user exists
  const user = await UserModel.findById(id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Prevent admin from deleting themselves
  if (id === req.user.id) {
    return next(new AppError('You cannot delete your own account', 400));
  }
  
  // Delete user
  await UserModel.delete(id);
  
  // Create activity
  await ActivityModel.create({
    userId: req.user.id,
    type: 'user_deleted',
    description: `Admin deleted user: ${user.first_name} ${user.last_name}`,
    metadata: { deletedUserId: id, deletedUserEmail: user.email }
  });
  
  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('user:deleted', {
      userId: id,
      message: `User deleted: ${user.first_name} ${user.last_name}`
    });
  }
  
  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// Get user statistics
exports.getUserStats = asyncHandler(async (req, res) => {
  const stats = await UserModel.getStats();
  
  res.json({
    success: true,
    data: {
      totalUsers: parseInt(stats.total_users),
      activeUsers: parseInt(stats.active_users),
      inactiveUsers: parseInt(stats.inactive_users),
      pendingUsers: parseInt(stats.pending_users),
      adminCount: parseInt(stats.admin_count),
      newUsersThisWeek: parseInt(stats.new_users_week),
      newUsersThisMonth: parseInt(stats.new_users_month)
    }
  });
});
