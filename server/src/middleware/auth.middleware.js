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
    const userId = decoded.id || decoded.userId || decoded._id;
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token payload. Please log in again.' });
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) return res.status(401).json({ message: 'User not found' });

    // Signed JWT role (always attach for restrictTo fallback if Mongoose omits role on the document)
    req.jwtRole = decoded.role;

    if (decoded.role != null && decoded.role !== '') {
      currentUser.role = decoded.role;
    }

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

// Role-based authorization (trim + case-insensitive match)
exports.restrictTo = (...roles) => {
  const allowed = roles.map((r) => String(r).trim().toLowerCase());
  return (req, res, next) => {
    const userRole = String(req.user?.role ?? req.jwtRole ?? '').trim().toLowerCase();
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    next();
  };
};
