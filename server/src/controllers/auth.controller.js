const { User } = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const sendEmail = require('../utils/email');

// Helper: Generate JWT
const signToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// ---------------- REGISTER ----------------
exports.register = async (req, res) => {
  try {
    console.log('Registration request body:', req.body);

    // 1. Explicitly destructure fields to prevent mass-assignment vulnerabilities
    // We do NOT use ...req.body here to prevent malicious injection (e.g., injecting isEmailVerified: true)
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      // Role specific fields
      specialization,
      licenseNumber,
      labName,
      accreditation
    } = req.body;

    // 2. Normalize Role and Check Permissions
    const normalizedRole = role ? role.toLowerCase() : 'parent';

    // SECURITY: Block public registration of Admins
    if (normalizedRole === 'admin') {
      return res.status(403).json({ message: 'Admin registration is restricted.' });
    }

    // 3. Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Email already registered:', email);
      return res.status(400).json({ message: 'Email already registered' });
    }

    // 4. Handle document uploads for professionals
    let documents = [];
    if ((normalizedRole === 'clinician' || normalizedRole === 'therapist') && req.files && req.files.length > 0) {
      const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 4000}`;
      documents = req.files.map(file => ({
        name: file.originalname,
        url: `${serverUrl}/uploads/documents/${file.filename}`,
        type: path.extname(file.originalname).toLowerCase()
      }));
    }

    // 5. Create User Instance
    // Mongoose will ignore fields (like labName) if they don't exist on the specific discriminator schema
    const newUser = new User({
      firstName,
      lastName,
      email,
      password,
      role: normalizedRole,
      specialization,
      licenseNumber,
      labName,
      accreditation,
      documents
    });

    // 5. Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    newUser.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    newUser.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await newUser.save();

    // 6. Send verification email
    // Note: Use the raw token in the URL, not the hashed one
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    
    try {
      await sendEmail({
        to: newUser.email,
        subject: 'Verify your account',
        text: `Welcome, ${firstName}! Please verify your email here: ${verificationUrl}`
      });
    } catch (emailErr) {
      console.error("Email failed to send, but user was created:", emailErr);
      // We don't fail the request, but we log it
    }

    res.status(201).json({ message: 'User registered. Please check your email to verify your account.' });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: err.message || 'Server error during registration' });
  }
};

// ---------------- LOGIN ----------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user and explicitly select password
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // Check verification status
    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    // Check approval status for professionals
    if ((user.role === 'clinician' || user.role === 'therapist') && user.approvalStatus !== 'active') {
      return res.status(403).json({ message: 'Your account is pending approval. Please contact admin.' });
    }

    // Update audit fields
    user.lastLogin = new Date();
    user.loginAttempts = 0;
    await user.save({ validateBeforeSave: false }); // Skip validation for login updates

    const token = signToken(user);

    // Return token and basic user info (excluding sensitive data)
    res.status(200).json({ 
      token, 
      role: user.role, 
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email 
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ---------------- VERIFY EMAIL ----------------
exports.verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Token is invalid or has expired' });

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ message: 'Email verified successfully! You can now login.' });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed' });
  }
};

// ---------------- RESEND VERIFICATION EMAIL ----------------
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No user found with that email' });

    if (user.isEmailVerified) return res.status(400).json({ message: 'Email is already verified' });

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await user.save({ validateBeforeSave: false });

    // Send verification email
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify your account',
        text: `Welcome, ${user.firstName}! Please verify your email here: ${verificationUrl}`
      });
    } catch (emailErr) {
      console.error("Email failed to send:", emailErr);
      return res.status(500).json({ message: 'Failed to send verification email' });
    }

    res.status(200).json({ message: 'Verification email sent successfully' });
  } catch (err) {
    console.error("Resend verification email error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ---------------- FORGOT PASSWORD ----------------
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'No user found with that email' });

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      text: `Reset your password here: ${resetUrl}`
    });

    res.status(200).json({ message: 'Token sent to email!' });
  } catch (err) {
    res.status(500).json({ message: 'Error sending reset email' });
  }
};

// ---------------- RESET PASSWORD ----------------
exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Token is invalid or has expired' });

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Reset failed' });
  }
};
