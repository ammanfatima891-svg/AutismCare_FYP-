const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Ensure upload directories exist
const uploadDirs = ['uploads/documents', 'uploads/lab-reports'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads/documents/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Middleware
const corsOptions = {
  origin: ['http://localhost:4173', 'http://localhost:5173'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Import routes
const authRoutes = require('./routes/auth.routes.js');
const adminRoutes = require('./routes/admin.routes.js');
const childRoutes = require('./routes/child.routes.js');
const screeningRoutes = require('./routes/screening.routes.js');
const labRoutes = require('./routes/lab.routes.js');

const connectDB = require('./config/database.js');

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/child", childRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/screening", screeningRoutes);
app.use("/api/lab", labRoutes);

const port = process.env.PORT || 4000;

const startServer = () => {
  try {
    app.listen(port, () => {
      connectDB();
      console.log('Server is running on port: ' + port);
    });
  } catch (error) {
    console.error('Error starting server:', error);
  }
};

startServer();
