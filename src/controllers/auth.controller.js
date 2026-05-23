const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const ActivityModel = require('../models/activity.model');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Register new user
exports.register = asyncHandler(async (req, res, next) => {
  const { email, password, firstName, lastName, phone, department } = req.body;
  
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
    phone,
    department
  });
  
  // Create activity
  await ActivityModel.create({
    userId: user.id,
    type: 'user_created',
    description: `New user registered: ${firstName} ${lastName}`
  });
  
  // Emit socket event for real-time notification
  const io = req.app.get('io');
  if (io) {
    io.emit('user:registered', {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      message: `New user registered: ${firstName} ${lastName}`
    });
  }
  
  // Generate token
  const token = generateToken(user.id);
  
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status
      },
      token
    }
  });
});

// Login user
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  
  // Find user
  const user = await UserModel.findByEmail(email);
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }
  
  // Check password
  const isPasswordValid = await UserModel.comparePassword(password, user.password);
  if (!isPasswordValid) {
    return next(new AppError('Invalid email or password', 401));
  }
  
  // Check if user is active
  if (user.status !== 'active') {
    return next(new AppError('Your account is not active. Please contact support.', 403));
  }
  
  // Update last login
  await UserModel.updateLastLogin(user.id);
  
  // Create activity
  await ActivityModel.create({
    userId: user.id,
    type: 'login',
    description: `User logged in: ${user.first_name} ${user.last_name}`
  });
  
  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('activity:new', {
      type: 'login',
      message: `${user.first_name} ${user.last_name} logged in`,
      userId: user.id
    });
  }
  
  // Generate token
  const token = generateToken(user.id);
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatar_url,
        department: user.department
      },
      token
    }
  });
});

// Get current user
exports.getMe = asyncHandler(async (req, res) => {
  const user = req.user;
  
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
        createdAt: user.created_at
      }
    }
  });
});

// Update current user
exports.updateMe = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, department } = req.body;
  
  const updatedUser = await UserModel.update(req.user.id, {
    firstName,
    lastName,
    phone,
    department
  });
  
  // Create activity
  await ActivityModel.create({
    userId: req.user.id,
    type: 'profile_update',
    description: `User updated profile: ${updatedUser.first_name} ${updatedUser.last_name}`
  });
  
  res.json({
    success: true,
    message: 'Profile updated successfully',
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
        department: updatedUser.department
      }
    }
  });
});

// Change password
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  // Get user with password
  const user = await UserModel.findByEmail(req.user.email);
  
  // Verify current password
  const isValid = await UserModel.comparePassword(currentPassword, user.password);
  if (!isValid) {
    return next(new AppError('Current password is incorrect', 400));
  }
  
  // Update password
  await UserModel.updatePassword(user.id, newPassword);
  
  // Create activity
  await ActivityModel.create({
    userId: user.id,
    type: 'password_change',
    description: 'User changed password'
  });
  
  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

// Logout
exports.logout = asyncHandler(async (req, res) => {
  // Create activity
  await ActivityModel.create({
    userId: req.user.id,
    type: 'logout',
    description: `User logged out: ${req.user.first_name} ${req.user.last_name}`
  });
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});
