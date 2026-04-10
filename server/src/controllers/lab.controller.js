const multer = require('multer');
const path = require('path');
const fs = require('fs');
const LabTestRequest = require('../models/LabTestRequest');
const LabReport = require('../models/LabReport');
const { AuditLog } = require('../models/AuditLog');
const { User } = require('../models/User');
const sendEmail = require('../utils/email');
const { createNotificationIfNotExists } = require('../utils/notification');
const { NOTIFICATION_TYPES } = require('../models/Notification');

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
            // In-app clinician notification (future-ready lab alert channel)
            await createNotificationIfNotExists({
                recipientId: testRequest.clinicianId,
                type: NOTIFICATION_TYPES.LAB_UPLOADED,
                title: 'New Lab Report Uploaded',
                message: `A new lab report has been uploaded for ${testRequest.childName}`,
                relatedResourceType: 'LabReport',
                relatedResourceId: report._id
            });

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


// ===================================================================
// CLINICIAN-FACING ENDPOINTS
// ===================================================================

// -------------------------------------------------------------------
// GET /api/lab/clinician/requests — test requests created by this clinician
// -------------------------------------------------------------------
exports.getClinicianTestRequests = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = { clinicianId: req.user._id };
        if (status && status !== 'ALL') filter.status = status;

        const requests = await LabTestRequest.find(filter)
            .populate('parentId', 'firstName lastName email phoneNumber')
            .sort({ createdAt: -1 });

        // For each request, attach its reports count
        const requestIds = requests.map(r => r._id);
        const reports = await LabReport.find({ testRequestId: { $in: requestIds } })
            .select('testRequestId');

        const reportCountMap = {};
        reports.forEach(r => {
            const key = r.testRequestId.toString();
            reportCountMap[key] = (reportCountMap[key] || 0) + 1;
        });

        const data = requests.map(r => ({
            ...r.toObject(),
            reportCount: reportCountMap[r._id.toString()] || 0
        }));

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('getClinicianTestRequests error:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve test requests' });
    }
};

// -------------------------------------------------------------------
// GET /api/lab/clinician/requests/:id — single request detail for clinician
// -------------------------------------------------------------------
exports.getClinicianRequestById = async (req, res) => {
    try {
        const request = await LabTestRequest.findOne({
            _id: req.params.id,
            clinicianId: req.user._id
        })
            .populate('parentId', 'firstName lastName email phoneNumber');

        if (!request) {
            return res.status(404).json({ success: false, message: 'Test request not found' });
        }

        const reports = await LabReport.find({ testRequestId: request._id })
            .populate('labTechnicianId', 'firstName lastName')
            .sort({ uploadedAt: -1 });

        res.status(200).json({ success: true, data: { ...request.toObject(), reports } });
    } catch (err) {
        console.error('getClinicianRequestById error:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve test request' });
    }
};

// -------------------------------------------------------------------
// PATCH /api/lab/clinician/requests/:id/release — release report to parent
// -------------------------------------------------------------------
exports.releaseReport = async (req, res) => {
    try {
        const request = await LabTestRequest.findOne({
            _id: req.params.id,
            clinicianId: req.user._id
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Test request not found' });
        }

        if (request.status !== 'UPLOADED') {
            return res.status(400).json({
                success: false,
                message: `Cannot release: current status is ${request.status}. Only UPLOADED requests can be released.`
            });
        }

        // Update status to RELEASED
        request.status = 'RELEASED';
        request.releasedToParent = true;
        await request.save();

        // Set releasedAt on all reports for this request
        await LabReport.updateMany(
            { testRequestId: request._id, releasedAt: null },
            { releasedAt: new Date() }
        );

        // Audit log
        await createAuditLog({
            userId: req.user._id,
            action: 'RELEASE',
            resource: 'LabTestRequest',
            resourceId: request._id,
            details: `Clinician released lab report for ${request.childName} (${request.testType}) to parent`,
            ipAddress: req.ip
        });

        // Notify parent via email
        try {
            const parent = await User.findById(request.parentId);
            if (parent && parent.email) {
                await sendEmail({
                    to: parent.email,
                    subject: 'Lab Report Released – AutismCare',
                    text: `The lab report for your child ${request.childName} (${request.testType}) has been reviewed by your clinician and is now available for you to view.`
                });
            }
        } catch (emailErr) {
            console.error('Release notification failed:', emailErr.message);
        }

        res.status(200).json({ success: true, data: request, message: 'Report released to parent' });
    } catch (err) {
        console.error('releaseReport error:', err);
        res.status(500).json({ success: false, message: 'Failed to release report' });
    }
};

// -------------------------------------------------------------------
// GET /api/lab/clinician/parents?search=... — search parents with children
// -------------------------------------------------------------------
exports.searchParentsWithChildren = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search || search.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Please provide at least 2 characters to search'
            });
        }

        const regex = new RegExp(search.trim(), 'i');

        const parents = await User.find({
            role: 'parent',
            $or: [
                { firstName: regex },
                { lastName: regex },
                { email: regex }
            ]
        })
            .select('firstName lastName email phoneNumber children')
            .limit(20);

        // Transform children to include computed age
        const data = parents.map(p => {
            const parent = p.toObject();
            parent.children = (parent.children || []).map(child => {
                const now = new Date();
                const dob = new Date(child.dateOfBirth);
                const age = Math.floor((now - dob) / (365.25 * 24 * 60 * 60 * 1000));
                return {
                    _id: child._id,
                    firstName: child.firstName,
                    lastName: child.lastName,
                    dateOfBirth: child.dateOfBirth,
                    gender: child.gender,
                    age
                };
            });
            return parent;
        });

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('searchParentsWithChildren error:', err);
        res.status(500).json({ success: false, message: 'Failed to search parents' });
    }
};

// -------------------------------------------------------------------
// POST /api/lab/clinician/requests — create a new lab test request
// -------------------------------------------------------------------
exports.createTestRequest = async (req, res) => {
    try {
        const { parentId, childId, childName, childAge, testType, notes } = req.body;

        // Validate required fields
        if (!parentId || !childId || !childName || childAge == null || !testType) {
            return res.status(400).json({
                success: false,
                message: 'parentId, childId, childName, childAge, and testType are required'
            });
        }

        // Validate testType
        const { TEST_TYPES } = require('../models/LabTestRequest');
        if (!TEST_TYPES.includes(testType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid test type. Must be one of: ${TEST_TYPES.join(', ')}`
            });
        }

        // Verify parent exists and has this child
        const parent = await User.findOne({ _id: parentId, role: 'parent' });
        if (!parent) {
            return res.status(404).json({ success: false, message: 'Parent not found' });
        }

        const childExists = (parent.children || []).some(
            c => c._id.toString() === childId.toString()
        );
        if (!childExists) {
            return res.status(400).json({
                success: false,
                message: 'Child not found under this parent'
            });
        }

        // Create the test request
        const testRequest = await LabTestRequest.create({
            childId,
            childName,
            childAge: Number(childAge),
            parentId,
            clinicianId: req.user._id,
            testType,
            notes: notes || '',
            status: 'PENDING'
        });

        // Audit log
        await createAuditLog({
            userId: req.user._id,
            action: 'CREATE',
            resource: 'LabTestRequest',
            resourceId: testRequest._id,
            details: `Clinician created lab test request for ${childName} (${testType})`,
            ipAddress: req.ip
        });

        // Notify parent via email
        try {
            if (parent.email) {
                await sendEmail({
                    to: parent.email,
                    subject: 'New Lab Test Requested – AutismCare',
                    text: `Your clinician has requested a ${testType} lab test for your child ${childName}. The lab will process this shortly.`
                });
            }
        } catch (emailErr) {
            console.error('Parent notification failed:', emailErr.message);
        }

        res.status(201).json({
            success: true,
            data: testRequest,
            message: 'Lab test request created successfully'
        });
    } catch (err) {
        console.error('createTestRequest error:', err);
        res.status(500).json({ success: false, message: 'Failed to create test request' });
    }
};

// ===================================================================
// PARENT-FACING ENDPOINTS
// ===================================================================

// -------------------------------------------------------------------
// GET /api/lab/parent/reports — released reports for the logged-in parent
// -------------------------------------------------------------------
exports.getParentReports = async (req, res) => {
    try {
        // Find all test requests that belong to this parent AND have been released
        const requests = await LabTestRequest.find({
            parentId: req.user._id,
            status: 'RELEASED',
            releasedToParent: true
        })
            .populate('clinicianId', 'firstName lastName email')
            .sort({ updatedAt: -1 });

        if (!requests.length) {
            return res.status(200).json({ success: true, data: [] });
        }

        // Fetch reports for all released requests in one query
        const requestIds = requests.map(r => r._id);
        const reports = await LabReport.find({ testRequestId: { $in: requestIds } })
            .populate('labTechnicianId', 'firstName lastName')
            .sort({ uploadedAt: -1 });

        // Group reports by testRequestId
        const reportsByRequest = {};
        reports.forEach(r => {
            const key = r.testRequestId.toString();
            if (!reportsByRequest[key]) reportsByRequest[key] = [];
            reportsByRequest[key].push(r);
        });

        // Merge reports into requests
        const data = requests.map(r => ({
            ...r.toObject(),
            reports: reportsByRequest[r._id.toString()] || []
        }));

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('getParentReports error:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve reports' });
    }
};
