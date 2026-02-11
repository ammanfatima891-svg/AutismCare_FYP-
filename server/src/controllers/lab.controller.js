const multer = require('multer');
const path = require('path');
const fs = require('fs');
const LabTestRequest = require('../models/LabTestRequest');
const LabReport = require('../models/LabReport');
const { AuditLog } = require('../models/AuditLog');
const { User } = require('../models/User');
const sendEmail = require('../utils/email');

// -------------------------------------------------------------------
// Multer configuration for lab report uploads (25MB max)
// -------------------------------------------------------------------
const uploadsDir = path.join(process.cwd(), 'uploads/lab-reports');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'lab-report-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const labUpload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|pdf/;
        const extValid = allowed.test(path.extname(file.originalname).toLowerCase());
        const mimeValid = allowed.test(file.mimetype);
        if (extValid && mimeValid) return cb(null, true);
        cb(new Error('Only PDF, JPG, and PNG files are allowed'));
    }
});

// -------------------------------------------------------------------
// Helper: create an audit log entry
// -------------------------------------------------------------------
const createAuditLog = async ({ userId, action, resource, resourceId, details, ipAddress }) => {
    try {
        await AuditLog.create({ userId, action, resource, resourceId, details, ipAddress });
    } catch (err) {
        console.error('Audit log error:', err.message);
    }
};

// -------------------------------------------------------------------
// GET /api/lab/requests — list all test requests with filtering
// -------------------------------------------------------------------
exports.getTestRequests = async (req, res) => {
    try {
        const { status, testType, startDate, endDate, page = 1, limit = 20 } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (testType) filter.testType = testType;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [requests, total] = await Promise.all([
            LabTestRequest.find(filter)
                .populate('clinicianId', 'firstName lastName email')
                .populate('parentId', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            LabTestRequest.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            data: requests,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (err) {
        console.error('getTestRequests error:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve test requests' });
    }
};

// -------------------------------------------------------------------
// GET /api/lab/requests/:id — single test request with full details
// -------------------------------------------------------------------
exports.getTestRequestById = async (req, res) => {
    try {
        const request = await LabTestRequest.findById(req.params.id)
            .populate('clinicianId', 'firstName lastName email specialization')
            .populate('parentId', 'firstName lastName email phoneNumber');

        if (!request) {
            return res.status(404).json({ success: false, message: 'Test request not found' });
        }

        // Also fetch any existing reports for this request
        const reports = await LabReport.find({ testRequestId: request._id })
            .populate('labTechnicianId', 'firstName lastName');

        res.status(200).json({ success: true, data: { ...request.toObject(), reports } });
    } catch (err) {
        console.error('getTestRequestById error:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve test request' });
    }
};

// -------------------------------------------------------------------
// POST /api/lab/reports/upload — upload a lab report file
// -------------------------------------------------------------------
exports.uploadReport = [
    labUpload.single('report'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            const { testRequestId } = req.body;
            if (!testRequestId) {
                // Clean up the uploaded file if validation fails
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ success: false, message: 'Test request ID is required' });
            }

            // Verify the test request exists
            const testRequest = await LabTestRequest.findById(testRequestId);
            if (!testRequest) {
                fs.unlinkSync(req.file.path);
                return res.status(404).json({ success: false, message: 'Test request not found' });
            }

            // Build the file URL relative to the server
            const fileUrl = `/uploads/lab-reports/${req.file.filename}`;

            // Create the lab report record
            const report = await LabReport.create({
                testRequestId: testRequest._id,
                childId: testRequest.childId,
                clinicianId: testRequest.clinicianId,
                labTechnicianId: req.user._id,
                fileUrl,
                fileType: req.file.mimetype,
                fileName: req.file.originalname,
                fileSize: req.file.size
            });

            // Update test request status to UPLOADED
            testRequest.status = 'UPLOADED';
            await testRequest.save();

            // Audit log
            await createAuditLog({
                userId: req.user._id,
                action: 'UPLOAD',
                resource: 'LabReport',
                resourceId: report._id,
                details: `Uploaded report for test request ${testRequestId}`,
                ipAddress: req.ip
            });

            // --- Send notifications ---
            // Notify clinician
            try {
                const clinician = await User.findById(testRequest.clinicianId);
                if (clinician && clinician.email) {
                    await sendEmail({
                        to: clinician.email,
                        subject: 'Lab Report Uploaded – AutismCare',
                        text: `A lab report for ${testRequest.childName} (${testRequest.testType}) has been uploaded and is ready for review.`
                    });
                }
            } catch (emailErr) {
                console.error('Clinician notification failed:', emailErr.message);
            }

            // Notify parent
            try {
                const parent = await User.findById(testRequest.parentId);
                if (parent && parent.email) {
                    await sendEmail({
                        to: parent.email,
                        subject: 'Lab Report Update – AutismCare',
                        text: `A lab report for your child ${testRequest.childName} (${testRequest.testType}) has been uploaded. Your clinician will review and release the results shortly.`
                    });
                }
            } catch (emailErr) {
                console.error('Parent notification failed:', emailErr.message);
            }

            res.status(201).json({ success: true, data: report, message: 'Report uploaded successfully' });
        } catch (err) {
            // Clean up file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            console.error('uploadReport error:', err);
            res.status(500).json({ success: false, message: 'Failed to upload report' });
        }
    }
];

// -------------------------------------------------------------------
// PATCH /api/lab/requests/:id/status — update test request status
// -------------------------------------------------------------------
exports.updateTestStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['PENDING', 'UPLOADED', 'RELEASED'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const request = await LabTestRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Test request not found' });
        }

        const previousStatus = request.status;
        request.status = status;

        // If releasing, mark the release timestamp on associated reports
        if (status === 'RELEASED') {
            request.releasedToParent = true;
            await LabReport.updateMany(
                { testRequestId: request._id, releasedAt: null },
                { releasedAt: new Date() }
            );
        }

        await request.save();

        // Audit log
        await createAuditLog({
            userId: req.user._id,
            action: 'UPDATE',
            resource: 'LabTestRequest',
            resourceId: request._id,
            details: `Status changed from ${previousStatus} to ${status}`,
            ipAddress: req.ip
        });

        res.status(200).json({ success: true, data: request, message: 'Status updated' });
    } catch (err) {
        console.error('updateTestStatus error:', err);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

// -------------------------------------------------------------------
// GET /api/lab/reports/:id — view report metadata
// -------------------------------------------------------------------
exports.getReportById = async (req, res) => {
    try {
        const report = await LabReport.findById(req.params.id)
            .populate('labTechnicianId', 'firstName lastName')
            .populate('clinicianId', 'firstName lastName email');

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        res.status(200).json({ success: true, data: report });
    } catch (err) {
        console.error('getReportById error:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve report' });
    }
};

// -------------------------------------------------------------------
// GET /api/lab/reports — list all reports
// -------------------------------------------------------------------
exports.getAllReports = async (req, res) => {
    try {
        const reports = await LabReport.find()
            .populate({
                path: 'testRequestId',
                select: 'childName testType status'
            })
            .populate('clinicianId', 'firstName lastName')
            .populate('labTechnicianId', 'firstName lastName')
            .sort({ uploadedAt: -1 });

        res.status(200).json({ success: true, data: reports });
    } catch (err) {
        console.error('getAllReports error:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve reports' });
    }
};

// -------------------------------------------------------------------
// GET /api/lab/stats — dashboard statistics
// -------------------------------------------------------------------
exports.getLabStats = async (req, res) => {
    try {
        const [pending, uploaded, released, totalReports] = await Promise.all([
            LabTestRequest.countDocuments({ status: 'PENDING' }),
            LabTestRequest.countDocuments({ status: 'UPLOADED' }),
            LabTestRequest.countDocuments({ status: 'RELEASED' }),
            LabReport.countDocuments()
        ]);

        res.status(200).json({
            success: true,
            data: { pending, uploaded, released, totalReports }
        });
    } catch (err) {
        console.error('getLabStats error:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve statistics' });
    }
};
