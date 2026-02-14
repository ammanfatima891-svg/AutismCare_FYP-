const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      typeof req.headers.authorization === 'string' &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.slice(7).trim();
    }
    if (!token) return res.status(401).json({ message: 'Not logged in' });
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
      return res.status(401).json({ message: 'Invalid or malformed token. Please log in again.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) return res.status(401).json({ message: 'User not found' });

    req.user = currentUser;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
    }
    console.error(err);
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Role-based authorization
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    next();
  };
};
