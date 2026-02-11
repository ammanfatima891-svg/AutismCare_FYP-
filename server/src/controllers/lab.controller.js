const { LabTestOrder, TEST_STATUS } = require('../models/LabTestOrder');
const { User, ROLES } = require('../models/User');
const { logAction, AUDIT_ACTIONS, RESOURCE_TYPES } = require('../utils/audit');
const { createNotification, NOTIFICATION_TYPES } = require('../utils/notification');
const { encryptFileInPlace, isEncryptionConfigured } = require('../utils/encryption');
const path = require('path');

// Input validation helper
const validateRequired = (fields, body) => {
    const missing = [];
    for (const field of fields) {
        if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
            missing.push(field);
        }
    }
    return missing;
};

// Get all test orders for lab technician
const getTestOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, priority, limit } = req.query;

        // Build filter
        const filter = {};

        // Lab technicians see all orders or those assigned to them
        if (req.user.role === ROLES.LAB) {
            // Can see unassigned orders or orders assigned to them
            filter.$or = [
                { labTechnicianId: userId },
                { labTechnicianId: null }
            ];
        }

        if (status) {
            filter.status = status;
        }

        if (priority) {
            filter.priority = priority;
        }

        let query = LabTestOrder.find(filter)
            .populate('parentId', 'firstName lastName email')
            .populate('clinicianId', 'firstName lastName specialization')
            .populate('labTechnicianId', 'firstName lastName labName')
            .sort({ priority: -1, createdAt: -1 });

        if (limit) {
            query = query.limit(parseInt(limit));
        }

        const orders = await query;

        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Error fetching test orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch test orders'
        });
    }
};

// Get pending test requests (as per requirements: GET /api/lab/requests)
const getPendingRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const orders = await LabTestOrder.find({
            status: TEST_STATUS.PENDING,
            $or: [
                { labTechnicianId: null },
                { labTechnicianId: userId }
            ]
        })
            .populate('parentId', 'firstName lastName email')
            .populate('clinicianId', 'firstName lastName specialization')
            .sort({ priority: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Error fetching pending requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending test requests'
        });
    }
};

// Get specific test order by ID
const getTestOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await LabTestOrder.findById(id)
            .populate('parentId', 'firstName lastName email phoneNumber')
            .populate('clinicianId', 'firstName lastName specialization')
            .populate('labTechnicianId', 'firstName lastName labName');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Test order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Error fetching test order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch test order'
        });
    }
};

// Assign test order to lab technician and start processing
const assignTestOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const order = await LabTestOrder.findById(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Test order not found'
            });
        }

        // Assign to current lab technician
        order.labTechnicianId = userId;
        order.status = TEST_STATUS.IN_PROGRESS;
        await order.save();

        // Audit log
        await logAction({
            userId,
            action: AUDIT_ACTIONS.ASSIGN,
            resourceType: RESOURCE_TYPES.LAB_TEST_ORDER,
            resourceId: order._id,
            ipAddress: req.auditContext?.ipAddress,
            userAgent: req.auditContext?.userAgent,
            details: { previousStatus: TEST_STATUS.PENDING, newStatus: TEST_STATUS.IN_PROGRESS }
        });

        res.status(200).json({
            success: true,
            message: 'Test order assigned successfully',
            data: order
        });
    } catch (error) {
        console.error('Error assigning test order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign test order'
        });
    }
};

// Update test order (add notes, results)
const updateTestOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { notes, results, status } = req.body;

        const order = await LabTestOrder.findById(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Test order not found'
            });
        }

        const changes = {};
        if (notes !== undefined) {
            changes.notes = { old: order.notes, new: notes };
            order.notes = notes;
        }
        if (results !== undefined) {
            changes.results = { old: order.results, new: results };
            order.results = results;
        }
        if (status !== undefined) {
            changes.status = { old: order.status, new: status };
            order.status = status;
        }

        await order.save();

        // Audit log
        await logAction({
            userId,
            action: AUDIT_ACTIONS.UPDATE,
            resourceType: RESOURCE_TYPES.LAB_TEST_ORDER,
            resourceId: order._id,
            ipAddress: req.auditContext?.ipAddress,
            userAgent: req.auditContext?.userAgent,
            details: { changes }
        });

        res.status(200).json({
            success: true,
            message: 'Test order updated successfully',
            data: order
        });
    } catch (error) {
        console.error('Error updating test order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update test order'
        });
    }
};

// Upload report for test order
const uploadReport = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { orderId } = req.body; // Alternative way to specify order

        const targetOrderId = id || orderId;

        if (!targetOrderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const order = await LabTestOrder.findById(targetOrderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Test order not found'
            });
        }

        const filePath = path.join(process.cwd(), 'uploads/lab-reports/', req.file.filename);

        // Encrypt file if encryption is configured
        let encrypted = false;
        if (isEncryptionConfigured()) {
            try {
                await encryptFileInPlace(filePath);
                encrypted = true;
            } catch (encError) {
                console.error('Encryption failed, saving unencrypted:', encError);
            }
        }

        // Save file path
        order.reportUrl = `/uploads/lab-reports/${req.file.filename}`;
        order.reportEncrypted = encrypted;
        await order.save();

        // Audit log
        await logAction({
            userId,
            action: AUDIT_ACTIONS.UPLOAD,
            resourceType: RESOURCE_TYPES.LAB_REPORT,
            resourceId: order._id,
            ipAddress: req.auditContext?.ipAddress,
            userAgent: req.auditContext?.userAgent,
            details: {
                filename: req.file.filename,
                size: req.file.size,
                encrypted
            }
        });

        res.status(200).json({
            success: true,
            message: 'Report uploaded successfully',
            data: {
                reportUrl: order.reportUrl,
                encrypted
            }
        });
    } catch (error) {
        console.error('Error uploading report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload report'
        });
    }
};

// Complete test order
const completeTestOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { results, notes } = req.body;

        const order = await LabTestOrder.findById(id)
            .populate('parentId', 'firstName lastName')
            .populate('clinicianId', 'firstName lastName');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Test order not found'
            });
        }

        if (!order.reportUrl) {
            return res.status(400).json({
                success: false,
                message: 'Cannot complete order without uploading a report'
            });
        }

        order.status = TEST_STATUS.COMPLETED;
        order.completedAt = new Date();
        if (results) order.results = results;
        if (notes) order.notes = notes;

        await order.save();

        // Audit log
        await logAction({
            userId,
            action: AUDIT_ACTIONS.COMPLETE,
            resourceType: RESOURCE_TYPES.LAB_TEST_ORDER,
            resourceId: order._id,
            ipAddress: req.auditContext?.ipAddress,
            userAgent: req.auditContext?.userAgent,
            details: { completedAt: order.completedAt }
        });

        // Send notifications to clinician
        if (order.clinicianId) {
            await createNotification({
                recipientId: order.clinicianId._id,
                type: NOTIFICATION_TYPES.ORDER_COMPLETED,
                title: 'Lab Report Ready',
                message: `Lab results for ${order.childName} (${order.testName}) are now available.`,
                relatedResourceType: 'LabTestOrder',
                relatedResourceId: order._id
            });
        }

        // If configured, auto-release to parent and notify
        if (process.env.AUTO_RELEASE_TO_PARENT === 'true') {
            order.isReleasedToParent = true;
            order.releasedAt = new Date();
            await order.save();

            if (order.parentId) {
                await createNotification({
                    recipientId: order.parentId._id,
                    type: NOTIFICATION_TYPES.REPORT_RELEASED,
                    title: 'Lab Report Available',
                    message: `Lab results for ${order.childName} (${order.testName}) are now available for viewing.`,
                    relatedResourceType: 'LabTestOrder',
                    relatedResourceId: order._id
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Test order completed successfully',
            data: order
        });
    } catch (error) {
        console.error('Error completing test order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete test order'
        });
    }
};

// Release report to parent
const releaseToParent = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const order = await LabTestOrder.findById(id)
            .populate('parentId', 'firstName lastName');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Test order not found'
            });
        }

        if (order.status !== TEST_STATUS.COMPLETED) {
            return res.status(400).json({
                success: false,
                message: 'Can only release completed orders to parents'
            });
        }

        order.isReleasedToParent = true;
        order.releasedAt = new Date();
        await order.save();

        // Audit log
        await logAction({
            userId,
            action: AUDIT_ACTIONS.RELEASE,
            resourceType: RESOURCE_TYPES.LAB_TEST_ORDER,
            resourceId: order._id,
            ipAddress: req.auditContext?.ipAddress,
            userAgent: req.auditContext?.userAgent,
            details: { releasedAt: order.releasedAt }
        });

        // Notify parent
        if (order.parentId) {
            await createNotification({
                recipientId: order.parentId._id,
                type: NOTIFICATION_TYPES.REPORT_RELEASED,
                title: 'Lab Report Available',
                message: `Lab results for ${order.childName} (${order.testName}) are now available for viewing.`,
                relatedResourceType: 'LabTestOrder',
                relatedResourceId: order._id
            });
        }

        res.status(200).json({
            success: true,
            message: 'Report released to parent successfully',
            data: order
        });
    } catch (error) {
        console.error('Error releasing report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to release report to parent'
        });
    }
};

// Create a new test order (used by clinicians)
const createTestOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { childId, childName, parentId, testType, testName, testDetails, priority } = req.body;

        // Validate required fields
        const missingFields = validateRequired(['childId', 'childName', 'parentId', 'testType', 'testName'], req.body);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        const order = new LabTestOrder({
            childId,
            childName,
            parentId,
            clinicianId: userId,
            testType,
            testName,
            testDetails,
            priority: priority || 'normal'
        });

        await order.save();

        // Audit log
        await logAction({
            userId,
            action: AUDIT_ACTIONS.CREATE,
            resourceType: RESOURCE_TYPES.LAB_TEST_ORDER,
            resourceId: order._id,
            ipAddress: req.auditContext?.ipAddress,
            userAgent: req.auditContext?.userAgent,
            details: { testType, testName, priority: order.priority }
        });

        // Notify lab technicians about new order (especially urgent ones)
        try {
            const labTechnicians = await User.find({ role: ROLES.LAB });
            const notificationType = priority === 'urgent'
                ? NOTIFICATION_TYPES.URGENT_ORDER
                : NOTIFICATION_TYPES.NEW_TEST_ORDER;

            for (const tech of labTechnicians) {
                await createNotification({
                    recipientId: tech._id,
                    type: notificationType,
                    title: priority === 'urgent' ? 'Urgent Test Order' : 'New Test Order',
                    message: `New ${testType} test (${testName}) ordered for ${childName}${priority === 'urgent' ? ' - URGENT' : ''}`,
                    relatedResourceType: 'LabTestOrder',
                    relatedResourceId: order._id
                });
            }
        } catch (notifyError) {
            console.error('Error sending notifications:', notifyError);
            // Don't fail the request if notifications fail
        }

        res.status(201).json({
            success: true,
            message: 'Test order created successfully',
            data: order
        });
    } catch (error) {
        console.error('Error creating test order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create test order'
        });
    }
};

// Get lab dashboard stats
const getLabStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const pending = await LabTestOrder.countDocuments({
            $or: [{ labTechnicianId: userId }, { labTechnicianId: null }],
            status: TEST_STATUS.PENDING
        });

        const inProgress = await LabTestOrder.countDocuments({
            labTechnicianId: userId,
            status: TEST_STATUS.IN_PROGRESS
        });

        const completedToday = await LabTestOrder.countDocuments({
            labTechnicianId: userId,
            status: TEST_STATUS.COMPLETED,
            completedAt: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
        });

        const urgent = await LabTestOrder.countDocuments({
            $or: [{ labTechnicianId: userId }, { labTechnicianId: null }],
            priority: 'urgent',
            status: { $ne: TEST_STATUS.COMPLETED }
        });

        res.status(200).json({
            success: true,
            data: {
                pending,
                inProgress,
                completedToday,
                urgent
            }
        });
    } catch (error) {
        console.error('Error fetching lab stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch lab statistics'
        });
    }
};

module.exports = {
    getTestOrders,
    getTestOrderById,
    getPendingRequests,
    assignTestOrder,
    updateTestOrder,
    uploadReport,
    completeTestOrder,
    releaseToParent,
    createTestOrder,
    getLabStats
};
