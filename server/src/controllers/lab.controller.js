const { getCurrentTime, getCurrentTimeMs, getAgeYearsFromDob, getAgeMonthsFromDob } = require('../utils/time.js');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const LabTestRequest = require('../models/LabTestRequest');
const LabReport = require('../models/LabReport');
const LabRequest = require('../models/LabRequest');
const { ChildCase } = require('../models/ChildCase');
const { AuditLog } = require('../models/AuditLog');
const { User } = require('../models/User');
const sendEmail = require('../utils/email');
const { createNotificationIfNotExists } = require('../utils/notification');
const { NOTIFICATION_TYPES } = require('../models/Notification');
const { validateFileStrict, wrapMulter } = require('../middleware/uploadValidation');
const { transitionCase, CASE_EVENTS } = require('../services/caseLifecycleService');
const { validateCaseState } = require('../middleware/validateCaseState');
const { ACTIONS } = require('../services/actionPermissionService');

// -------------------------------------------------------------------
// Multer configuration for lab report uploads
// Global rule: Images (jpeg/png/webp) <=5MB, PDFs <=10MB.
// -------------------------------------------------------------------
const uploadsDir = path.join(process.cwd(), 'uploads/lab-reports');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = getCurrentTimeMs() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'lab-report-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const labUpload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max (PDF). Images further restricted to 5MB.
    fileFilter: (req, file, cb) => {
        const v = validateFileStrict({ ...file, size: 0 }, ['image', 'pdf']);
        if (v.ok) return cb(null, true);
        cb(new Error('Only jpeg/png/webp images or PDFs are allowed'));
    }
});

const labUploadSingle = wrapMulter(labUpload.single('report'));

// -------------------------------------------------------------------
// Helper: create an audit log entry
// -------------------------------------------------------------------
const createAuditLog = async ({ userId, action, resourceType, resource, resourceId, details, ipAddress }) => {
    try {
        await AuditLog.create({
            userId,
            action,
            resourceType: resourceType || resource,
            resourceId: String(resourceId),
            details,
            ipAddress
        });
    } catch (err) {
        console.error('Audit log error:', err.message);
    }
};

// -------------------------------------------------------------------
// GET /api/lab/requests — list all test requests with filtering
// -------------------------------------------------------------------
exports.getTestRequests = async (req, res) => {
    try {
        const { status, testType, startDate, endDate, page = 1, limit = 20, category, purpose } = req.query;

        const filter = {};
        if (status) filter.status = status;
        // Legacy filter: testType is still supported.
        if (testType) filter.testType = testType;
        // New filter: category matches any requestedItems.category
        if (category) filter.requestedItems = { $elemMatch: { category } };
        if (purpose) filter.requestPurpose = purpose;
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

        let caseStatus = null;
        try {
            if (request.caseId) {
                const c = await ChildCase.findById(request.caseId).select('status').lean();
                caseStatus = c?.status || null;
            }
        } catch (_) {
            caseStatus = null;
        }

        res.status(200).json({ success: true, data: { ...request.toObject(), caseStatus, reports } });
    } catch (err) {
        console.error('getTestRequestById error:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve test request' });
    }
};

// -------------------------------------------------------------------
// POST /api/lab/reports/upload — upload a lab report file
// -------------------------------------------------------------------
exports.uploadReport = [
    labUploadSingle,
    validateCaseState({
        childCaseId: 'body.caseId',
        requiredStatuses: ['DIAGNOSIS'],
        actionName: ACTIONS.UPLOAD_LAB_REPORT,
        message: 'Lab report upload is only allowed during DIAGNOSIS.',
    }),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }
            const strict = validateFileStrict(req.file, ['image', 'pdf']);
            if (!strict.ok) {
                if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(400).json({ success: false, message: strict.message, errorCode: strict.errorCode });
            }

            const { testRequestId, caseId } = req.body;
            if (!testRequestId) {
                // Clean up the uploaded file if validation fails
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ success: false, message: 'Test request ID is required' });
            }
            if (!caseId) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ success: false, message: 'caseId is required' });
            }

            // Verify the test request exists
            const testRequest = await LabTestRequest.findById(testRequestId);
            if (!testRequest) {
                fs.unlinkSync(req.file.path);
                return res.status(404).json({ success: false, message: 'Test request not found' });
            }
            // Hard guard: uploaded report must match the gated caseId
            if (testRequest.caseId && String(testRequest.caseId) !== String(caseId)) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ success: false, message: 'caseId does not match test request' });
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

            // Lifecycle: LAB_UPLOADS_REPORT -> DIAGNOSIS_READY (requires caseId on request)
            try {
                if (testRequest.caseId) {
                    await transitionCase({
                        caseId: testRequest.caseId,
                        eventType: CASE_EVENTS.LAB_UPLOADS_REPORT,
                        payload: { testRequestId: testRequest._id, reportId: report._id },
                        triggeredBy: req.user._id,
                    });
                }
            } catch (e) {
                console.error('[uploadReport] case lifecycle transition failed:', e?.message || e);
            }

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
// PATCH /api/lab/requests/:id/accept — lab accepts a pending request (event only)
// -------------------------------------------------------------------
exports.acceptTestRequest = async (req, res) => {
    try {
        const request = await LabTestRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Test request not found' });
        }
        if (request.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: `Only PENDING requests can be accepted (current: ${request.status})` });
        }

        // Lifecycle: LAB_ACCEPTS_REQUEST (status stays DIAGNOSIS)
        try {
            if (request.caseId) {
                await transitionCase({
                    caseId: request.caseId,
                    eventType: CASE_EVENTS.LAB_ACCEPTS_REQUEST,
                    payload: { testRequestId: request._id },
                    triggeredBy: req.user._id,
                });
            }
        } catch (e) {
            return res.status(400).json({ success: false, message: e?.message || 'Invalid case transition' });
        }

        // Keep request.status as PENDING (accepted is tracked by audit log only for now)
        await createAuditLog({
            userId: req.user._id,
            action: 'ACCEPT',
            resource: 'LabTestRequest',
            resourceId: request._id,
            details: 'Lab accepted test request',
            ipAddress: req.ip
        });

        res.status(200).json({ success: true, data: request, message: 'Request accepted' });
    } catch (err) {
        console.error('acceptTestRequest error:', err);
        res.status(500).json({ success: false, message: 'Failed to accept request' });
    }
};

// -------------------------------------------------------------------
// PATCH /api/lab/requests/:id/status — manual status updates are DISABLED (state-driven system)
// -------------------------------------------------------------------
exports.updateTestStatus = async (req, res) => {
    try {
        const { status } = req.body || {};
        const next = String(status || '').trim().toUpperCase();

        // Backward-compatible behavior for older clients/tests:
        // Allow lab to mark a request UPLOADED (which is effectively "report uploaded").
        if (next !== 'UPLOADED') {
            return res.status(400).json({
                success: false,
                message: 'Only UPLOADED transition is supported here. Use clinician release endpoint for RELEASED.',
            });
        }

        const request = await LabTestRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Test request not found' });

        const previousStatus = String(request.status || '').toUpperCase();
        if (previousStatus === 'RELEASED') {
            return res.status(400).json({ success: false, message: 'RELEASED requests cannot be changed' });
        }

        request.status = 'UPLOADED';
        await request.save();

        try {
            if (request.caseId) {
                await transitionCase({
                    caseId: request.caseId,
                    eventType: CASE_EVENTS.LAB_UPLOADS_REPORT,
                    payload: { testRequestId: request._id, via: 'updateTestStatus' },
                    triggeredBy: req.user._id,
                });
            }
        } catch (e) {
            console.error('[updateTestStatus] case lifecycle transition failed:', e?.message || e);
        }

        return res.status(200).json({ success: true, data: request, message: 'Status updated' });
    } catch (err) {
        console.error('updateTestStatus error:', err);
        return res.status(500).json({ success: false, message: 'Failed to update status' });
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

        const reportCount = await LabReport.countDocuments({ testRequestId: request._id });
        if (reportCount === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot release: no uploaded report metadata found for this request'
            });
        }

        // Update status to RELEASED
        request.status = 'RELEASED';
        request.releasedToParent = true;
        await request.save();

        // Set releasedAt on all reports for this request
        await LabReport.updateMany(
            { testRequestId: request._id, releasedAt: null },
            { releasedAt: getCurrentTime() }
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

        // Transform children to include computed age (years + months for under one year)
        const data = parents.map(p => {
            const parent = p.toObject();
            parent.children = (parent.children || []).map(child => {
                const dob = new Date(child.dateOfBirth);
                const ageYears = getAgeYearsFromDob(dob);
                const ageMonths = getAgeMonthsFromDob(dob);
                const ageLabel =
                    ageYears >= 1
                        ? `${ageYears} year${ageYears === 1 ? '' : 's'} old`
                        : `${ageMonths} month${ageMonths === 1 ? '' : 's'} old`;
                return {
                    _id: child._id,
                    firstName: child.firstName,
                    lastName: child.lastName,
                    dateOfBirth: child.dateOfBirth,
                    gender: child.gender,
                    age: ageYears,
                    ageMonths,
                    ageLabel,
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
        const {
            parentId,
            childId,
            childName,
            childAge,
            testType,
            notes,
            caseId,
            requestPurpose,
            priority,
            requestedItems,
            requestSummary,
        } = req.body;

        // Validate required fields
        if (!parentId || !childId || !childName || childAge == null) {
            return res.status(400).json({
                success: false,
                message: 'parentId, childId, childName, and childAge are required'
            });
        }

        const {
            TEST_TYPES,
            REQUEST_ITEM_CATEGORIES,
        } = require('../models/LabTestRequest');

        const hasItems = Array.isArray(requestedItems) && requestedItems.length > 0;
        const hasLegacyType = typeof testType === 'string' && testType.trim().length > 0;

        if (!hasItems && !hasLegacyType) {
            return res.status(400).json({
                success: false,
                message: 'Provide either requestedItems (preferred) or testType (legacy)',
            });
        }

        // Validate legacy testType if present
        if (hasLegacyType && !TEST_TYPES.includes(testType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid test type. Must be one of: ${TEST_TYPES.join(', ')}`,
            });
        }

        // Validate requestedItems if present
        let normalizedItems = [];
        if (hasItems) {
            normalizedItems = requestedItems.map((it) => ({
                category: String(it.category || '').trim(),
                code: String(it.code || '').trim(),
                name: String(it.name || '').trim(),
                whenIndicatedOnly: it.whenIndicatedOnly !== false,
                typicalForASDWorkup: !!it.typicalForASDWorkup,
                indications: Array.isArray(it.indications) ? it.indications.map(String).filter(Boolean).slice(0, 10) : [],
                notes: String(it.notes || '').trim(),
            }));

            const bad = normalizedItems.find((it) => !it.name || !REQUEST_ITEM_CATEGORIES.includes(it.category));
            if (bad) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid requestedItems: each item requires a valid category and name`,
                });
            }
        }

        const computedSummary = (() => {
            if (typeof requestSummary === 'string' && requestSummary.trim()) return requestSummary.trim().slice(0, 180);
            if (normalizedItems.length === 0) return '';
            const names = normalizedItems.map((i) => i.name).slice(0, 3);
            const more = normalizedItems.length > 3 ? ` +${normalizedItems.length - 3} more` : '';
            return `${names.join(', ')}${more}`;
        })();

        const computedLegacyType = (() => {
            if (hasLegacyType) return testType;
            if (normalizedItems.length === 0) return 'Other';
            // Map categories to existing TEST_TYPES for legacy list UIs
            const cat = normalizedItems[0].category;
            if (cat === 'Genetics') return 'Genetic';
            if (cat === 'Imaging') return 'Imaging';
            if (cat === 'Neurology') return 'EEG';
            if (cat === 'Laboratory') return 'Blood';
            if (cat === 'Developmental' || cat === 'Psychiatry') return 'Behavioral';
            return 'Other';
        })();

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

        if (!caseId) {
            return res.status(400).json({ success: false, message: 'caseId is required' });
        }
        if (!mongoose.Types.ObjectId.isValid(caseId)) {
            return res.status(400).json({ success: false, message: 'Invalid caseId' });
        }
        const caseDoc = await ChildCase.findById(caseId).select('_id parentId childId clinicianId status').lean();
        if (!caseDoc) {
            return res.status(404).json({ success: false, message: 'Case not found' });
        }
        if (String(caseDoc.parentId) !== String(parentId) || String(caseDoc.childId) !== String(childId)) {
            return res.status(400).json({
                success: false,
                message: 'caseId does not match the selected parent and child',
            });
        }
        if (caseDoc.clinicianId && String(caseDoc.clinicianId || '') !== String(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Only the assigned clinician can prescribe lab tests for this case',
            });
        }
        if (!caseDoc.clinicianId) {
            await ChildCase.updateOne({ _id: caseDoc._id }, { $set: { clinicianId: req.user._id } });
            caseDoc.clinicianId = req.user._id;
        }

        // Create the test request
        const testRequest = await LabTestRequest.create({
            childId,
            childName,
            childAge: Number(childAge),
            parentId,
            clinicianId: req.user._id,
            testType: computedLegacyType,
            requestPurpose: ['ASD_DIAGNOSTIC_WORKUP', 'CO_OCCURRING_CONDITIONS', 'OTHER'].includes(requestPurpose)
                ? requestPurpose
                : 'ASD_DIAGNOSTIC_WORKUP',
            priority: ['ROUTINE', 'URGENT'].includes(priority) ? priority : 'ROUTINE',
            requestedItems: normalizedItems,
            requestSummary: computedSummary,
            notes: notes || '',
            status: 'PENDING',
            caseId: caseDoc._id,
        });

        // Lifecycle: CLINICIAN_PRESCRIBES_LAB_TEST -> DIAGNOSIS
        try {
            await transitionCase({
                caseId: caseDoc._id,
                eventType: CASE_EVENTS.CLINICIAN_PRESCRIBES_LAB_TEST,
                payload: { testRequestId: testRequest._id },
                triggeredBy: req.user._id,
            });
        } catch (e) {
            // Hard fail: prescribing lab tests must not succeed without state transition.
            await LabTestRequest.deleteOne({ _id: testRequest._id });
            return res.status(400).json({ success: false, message: e?.message || 'Invalid case transition' });
        }

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
                    text: `Your clinician has requested diagnostic investigations for your child ${childName}. The lab/team will process this shortly.`
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
        const parent = await User.findById(req.user._id).select('children').lean();
        const childRows = Array.isArray(parent?.children) ? parent.children : [];
        const childIds = childRows.map((c) => c._id).filter(Boolean);
        const childMap = new Map(
            childRows.map((c) => {
                const childName = `${c?.firstName || ''} ${c?.lastName || ''}`.trim() || 'Child';
                const childAge = c?.dateOfBirth ? getAgeYearsFromDob(new Date(c.dateOfBirth)) : 0;
                return [String(c._id), { childName, childAge }];
            })
        );

        const [legacyRequests, modernRequests] = await Promise.all([
            LabTestRequest.find({
                parentId: req.user._id,
                status: 'RELEASED',
                releasedToParent: true
            })
                .populate('clinicianId', 'firstName lastName email')
                .sort({ updatedAt: -1 }),
            childIds.length
                ? LabRequest.find({
                    child_id: { $in: childIds },
                    status: 'completed',
                    report_url: { $exists: true, $ne: '' },
                })
                    .populate('test_id', 'test_name category')
                    .populate('clinician_id', 'firstName lastName email')
                    .sort({ updatedAt: -1 })
                    .lean()
                : Promise.resolve([]),
        ]);

        // Fetch reports for released legacy requests in one query
        const legacyRequestIds = legacyRequests.map((r) => r._id);
        const legacyReports = legacyRequestIds.length
            ? await LabReport.find({ testRequestId: { $in: legacyRequestIds } })
                .populate('labTechnicianId', 'firstName lastName')
                .sort({ uploadedAt: -1 })
            : [];

        const reportsByLegacyRequest = {};
        legacyReports.forEach((r) => {
            const key = String(r.testRequestId);
            if (!reportsByLegacyRequest[key]) reportsByLegacyRequest[key] = [];
            reportsByLegacyRequest[key].push(r);
        });

        const legacyData = legacyRequests.map((r) => ({
            ...r.toObject(),
            reports: reportsByLegacyRequest[String(r._id)] || [],
        }));

        const modernData = modernRequests.map((row) => {
            const childMeta = childMap.get(String(row.child_id)) || { childName: 'Child', childAge: 0 };
            return {
                _id: row._id,
                childId: row.child_id,
                childName: childMeta.childName,
                childAge: childMeta.childAge,
                testType: row?.test_id?.test_name || 'Lab test',
                notes: row.notes || '',
                status: 'RELEASED',
                releasedToParent: true,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
                clinicianId: row.clinician_id || null,
                reports: row.report_url
                    ? [{
                        _id: `${row._id}-report`,
                        fileUrl: row.report_url,
                        fileType: 'link',
                        fileName: `${row?.test_id?.test_name || 'Lab test'} report`,
                        fileSize: 0,
                        uploadedAt: row.updatedAt || row.createdAt,
                        releasedAt: row.updatedAt || row.createdAt,
                        labTechnicianId: null,
                    }]
                    : [],
            };
        });

        const data = [...legacyData, ...modernData].sort(
            (a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
        );

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('getParentReports error:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve reports' });
    }
};
