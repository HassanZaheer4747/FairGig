const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const { name, email, password, role, city, platform, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    const user = await User.create({ name, email, password, role, city, platform, phone });
    const token = generateToken(user._id, user.role);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: user.toPublic(),
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Server error during signup' });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = generateToken(user._id, user.role);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toPublic(),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toPublic ? req.user.toPublic() : req.user });
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, city, platform, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, city, platform, phone },
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Profile update failed' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').lean();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

exports.validateToken = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ valid: false });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ valid: false });
    res.json({ valid: true, user, role: user.role });
  } catch {
    res.status(401).json({ valid: false });
  }
};
