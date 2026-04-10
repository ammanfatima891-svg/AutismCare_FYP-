const Activity = require('../models/Activity');

const ACTIVITY_DOMAIN_OPTIONS = Activity.ACTIVITY_DOMAIN_OPTIONS;
const DIFFICULTY_OPTIONS = Activity.DIFFICULTY_OPTIONS;

/**
 * Normalizes request body for create/update. Keeps legacy `instructions` alongside objective/procedure/notes.
 */
function normalizeActivityInput(body, existing = {}) {
  const merge = (key, def = '') => {
    if (body && body[key] !== undefined) return String(body[key] ?? def).trim();
    if (existing && existing[key] !== undefined) return String(existing[key] ?? def).trim();
    return String(def).trim();
  };

  const name = merge('name', existing.name || '');
  const objective = merge('objective', existing.objective || '');
  const procedure = merge('procedure', existing.procedure || '');
  const notes = merge('notes', existing.notes || '');
  const instructions = merge('instructions', existing.instructions || '');
  const materials = merge('materials', existing.materials || '');
  const frequency = merge('frequency', existing.frequency || '');
  const difficulty = DIFFICULTY_OPTIONS.includes(body?.difficulty)
    ? body.difficulty
    : DIFFICULTY_OPTIONS.includes(existing?.difficulty)
      ? existing.difficulty
      : 'Medium';
  const parentInvolvement =
    body && body.parentInvolvement !== undefined ? Boolean(body.parentInvolvement) : Boolean(existing.parentInvolvement);
  const domainRaw = body?.domain !== undefined ? body.domain : existing.domain;
  const domain = ACTIVITY_DOMAIN_OPTIONS.includes(domainRaw) ? domainRaw : null;

  let isTemplate;
  if (body && body.isTemplate !== undefined) {
    isTemplate = Boolean(body.isTemplate);
  } else if (existing && existing.isTemplate !== undefined) {
    isTemplate = Boolean(existing.isTemplate);
  } else {
    isTemplate = true;
  }

  return {
    name,
    objective,
    procedure,
    notes,
    instructions,
    materials,
    frequency,
    difficulty,
    parentInvolvement,
    domain,
    isTemplate,
  };
}

/**
 * Library view: platform templates (createdBy null) + this therapist's templates.
 * Includes legacy rows missing isTemplate.
 */
function templateBaseQuery(therapistId) {
  return {
    $and: [
      {
        $or: [{ createdBy: null }, { createdBy: therapistId }],
      },
      {
        $or: [{ isTemplate: true }, { isTemplate: { $exists: false } }],
      },
    ],
  };
}

/** Match activities the therapist may clone or assign (platform + own). */
function activityAccessFilter(therapistId) {
  return {
    $or: [{ createdBy: null }, { createdBy: therapistId }],
  };
}

function applyDomainFilter(q, domain) {
  if (!domain || domain === 'all' || !String(domain).trim()) return;
  const d = String(domain);
  if (d === 'Behavioral') {
    q.domain = { $in: ['Behavioral', 'Behavioral (ABA)'] };
  } else if (ACTIVITY_DOMAIN_OPTIONS.includes(d)) {
    q.domain = d;
  }
}

function applySearchFilter(q, search) {
  if (!search || !String(search).trim()) return;
  const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  q.name = rx;
}

/** At least one narrative field for create/update validation */
function hasActivityBodyContent(n) {
  return Boolean(
    String(n.instructions || '').trim() ||
      String(n.objective || '').trim() ||
      String(n.procedure || '').trim()
  );
}

module.exports = {
  normalizeActivityInput,
  templateBaseQuery,
  activityAccessFilter,
  applyDomainFilter,
  applySearchFilter,
  hasActivityBodyContent,
  ACTIVITY_DOMAIN_OPTIONS,
  DIFFICULTY_OPTIONS,
};
