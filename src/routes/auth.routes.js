const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { registerValidation, loginValidation, changePasswordValidation } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateMe);
router.post('/change-password', authenticate, changePasswordValidation, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
