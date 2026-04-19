const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

const signupValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['worker', 'verifier', 'advocate']),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

router.post('/signup', signupValidation, authController.signup);
router.post('/login', loginValidation, authController.login);
router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);
router.get('/validate', authController.validateToken);
router.get('/users', authenticate, authorize('advocate', 'verifier'), authController.getAllUsers);

module.exports = router;
