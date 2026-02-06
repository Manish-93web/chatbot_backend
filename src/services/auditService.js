const AuditLog = require('../models/AuditLog');

/**
 * Log a system action to the database
 * @param {Object} params - The log parameters
 */
const logAction = async ({
    userId,
    userType,
    action,
    resource,
    resourceId = null,
    changes = null,
    ipAddress = null,
    userAgent = null,
    severity = 'low',
    success = true,
    errorMessage = null,
    metadata = {}
}) => {
    try {
        await AuditLog.create({
            userId,
            userType,
            action,
            resource,
            resourceId,
            changes,
            ipAddress,
            userAgent,
            severity,
            success,
            errorMessage,
            metadata
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
};

module.exports = {
    logAction
};
