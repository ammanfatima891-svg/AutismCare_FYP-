const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Ensure upload directories exist
const uploadDirs = ['uploads/documents', 'uploads/lab-reports', 'uploads/appointment-documents', 'uploads/home-assignments'];
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

// Dev: reflect request origin so http://127.0.0.1, LAN IP (Vite host: true), and localhost all work with credentials
const isProd = process.env.NODE_ENV === 'production';
const corsOptions = {
  origin: isProd
    ? (process.env.CLIENT_URL ? [process.env.CLIENT_URL] : ['http://localhost:4173', 'http://localhost:5173'])
    : true,
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
const notificationRoutes = require('./routes/notification.routes.js');
const appointmentRoutes = require('./routes/appointment.routes.js');
const therapistRoutes = require('./routes/therapist.routes.js');
const therapistCaseRoutes = require('./routes/therapistCaseRoutes.js');
const parentRoutes = require('./routes/parent.routes.js');
const clinicianRoutes = require('./routes/clinician.routes.js');
const caseRoutes = require('./routes/case.routes.js');
const evaluationRoutes = require('./routes/evaluation.routes.js');
const referralRoutes = require('./routes/referralRoutes.js');
const therapyRoutes = require('./routes/therapyRoutes.js');
const progressRoutes = require('./routes/progressRoutes.js');
const therapyPlanRoutes = require('./routes/therapyPlanRoutes.js');
const activityRoutes = require('./routes/activityRoutes.js');
const sessionRoutes = require('./routes/sessionRoutes.js');
const homeAssignmentRoutes = require('./routes/homeAssignmentRoutes.js');
const messageRoutes = require('./routes/messageRoutes.js');
const integrationRoutes = require('./routes/integrationRoutes.js');
const analyticsRoutes = require('./routes/analyticsRoutes.js');
const reportRoutes = require('./routes/reportRoutes.js');
const { scheduleRouter, sessionSlotRouter } = require('./routes/scheduleRoutes.js');


const connectDB = require('./config/database.js');

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/child", childRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/screening", screeningRoutes);
app.use("/api/lab", labRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/therapist", therapistRoutes);
app.use("/api/therapist", therapistCaseRoutes);
app.use("/api/clinician", clinicianRoutes);
app.use("/api/cases", caseRoutes);
/** Case-centric progress + summary (parent / clinician / therapist with case access). */
app.use('/api/case', integrationRoutes);
app.use('/api/schedules', scheduleRouter);
app.use('/api/sessionslots', sessionSlotRouter);
app.use("/api/evaluations", evaluationRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/therapy", therapyRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/therapy-plan", therapyPlanRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/assignments", homeAssignmentRoutes);
app.use('/api/messaging', messageRoutes);


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
