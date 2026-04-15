const { getCurrentTime, getCurrentTimeMs } = require('./time.js');
const { AuditLog, AUDIT_ACTIONS, RESOURCE_TYPES } = require('../models/AuditLog');

/**
 * Log an action for audit purposes
 * @param {Object} params - Parameters for the audit log
 * @param {string} params.userId - ID of the user performing the action
 * @param {string} params.action - Action type (CREATE, UPDATE, DELETE, etc.)
 * @param {string} params.resourceType - Type of resource being acted upon
 * @param {string} params.resourceId - ID of the resource
 * @param {string} params.ipAddress - IP address of the request
 * @param {string} params.userAgent - User agent string
 * @param {Object} params.details - Additional details about the action
 */
const logAction = async ({
    userId,
    action,
    resourceType,
    resourceId,
    ipAddress,
    userAgent,
    details
}) => {
    try {
        const auditLog = new AuditLog({
            userId,
            action,
            resourceType,
            resourceId: String(resourceId),
            ipAddress,
            userAgent,
            details,
            timestamp: getCurrentTime()
        });

        await auditLog.save();
        return auditLog;
    } catch (error) {
        // Log error but don't throw - audit logging shouldn't break main functionality
        console.error('Audit logging error:', error);
        return null;
    }
};

/**
 * Get audit logs for a specific resource
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - ID of the resource
 * @param {number} limit - Maximum number of logs to return
 */
const getResourceAuditLogs = async (resourceType, resourceId, limit = 50) => {
    try {
        return await AuditLog.find({ resourceType, resourceId: String(resourceId) })
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate('userId', 'firstName lastName email role');
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return [];
    }
};

/**
 * Get audit logs for a specific user
 * @param {string} userId - ID of the user
 * @param {number} limit - Maximum number of logs to return
 */
const getUserAuditLogs = async (userId, limit = 100) => {
    try {
        return await AuditLog.find({ userId })
            .sort({ timestamp: -1 })
            .limit(limit);
    } catch (error) {
        console.error('Error fetching user audit logs:', error);
        return [];
    }
};

/**
 * Middleware to capture IP address and user agent for audit logging
 */
const auditContext = (req, res, next) => {
    req.auditContext = {
        ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
    };
    next();
};

module.exports = {
    logAction,
    getResourceAuditLogs,
    getUserAuditLogs,
    auditContext,
    AUDIT_ACTIONS,
    RESOURCE_TYPES
};
