const { AuditEvent } = require('../models/AuditEvent');

/**
 * @param {object} params
 * @param {import('express').Request} [params.req]
 * @param {import('mongoose').Types.ObjectId|string} params.actorId
 * @param {string} [params.actorRole]
 * @param {string} params.action
 * @param {string} params.entityType
 * @param {import('mongoose').Types.ObjectId|string} params.entityId
 * @param {import('mongoose').Types.ObjectId|string} [params.caseId]
 * @param {string} [params.summary]
 * @param {unknown} [params.before]
 * @param {unknown} [params.after]
 */
async function recordAuditEvent({
  req,
  actorId,
  actorRole,
  action,
  entityType,
  entityId,
  caseId,
  summary,
  before,
  after,
}) {
  const role =
    actorRole ||
    (req?.user?.role ? String(req.user.role) : '') ||
    (req?.jwtRole ? String(req.jwtRole) : '');

  await AuditEvent.create({
    actorId,
    actorRole: role,
    action,
    entityType,
    entityId,
    caseId: caseId || undefined,
    timestamp: new Date(),
    summary: summary || '',
    before: before !== undefined ? before : undefined,
    after: after !== undefined ? after : undefined,
  });
}

module.exports = { recordAuditEvent };
