const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { createUserValidation, updateUserValidation, idValidation, paginationValidation } = require('../middleware/validation.middleware');

// All routes require authentication
router.use(authenticate);

// Get all users (with pagination and search)
router.get('/', paginationValidation, userController.getAllUsers);

// Get single user
router.get('/:id', idValidation, userController.getUserById);

// Create user (admin only)
router.post('/', authorize('admin'), createUserValidation, userController.createUser);

// Update user (admin only)
router.put('/:id', authorize('admin'), updateUserValidation, userController.updateUser);

// Delete user (admin only)
router.delete('/:id', authorize('admin'), idValidation, userController.deleteUser);

// Get user statistics
router.get('/stats/overview', userController.getUserStats);

module.exports = router;
