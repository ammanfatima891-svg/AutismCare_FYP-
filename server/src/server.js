const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

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
app.use(cors({
  origin: 'http://localhost:4173',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const authRoutes = require('./routes/auth.routes.js');
const adminRoutes = require('./routes/admin.routes.js');
const childRoutes = require('./routes/child.routes.js');
const screeningRoutes = require('./routes/screening.routes.js');

const connectDB = require('./config/database.js');

app.use("/api/auth", authRoutes);
app.use("/api/child", childRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/screening", screeningRoutes);


    
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



