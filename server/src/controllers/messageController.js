const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { ChildCase } = require('../models/ChildCase');
const TherapyCase = require('../models/TherapyCase');
const { HomeAssignment } = require('../models/HomeAssignment');
const { User } = require('../models/User');
const { assertTherapistCaseAccess } = require('../utils/therapistCaseAccess');

async function assertParentOwnsCase(parentId, caseId) {
  return ChildCase.findOne({ _id: caseId, parentId }).select('_id parentId childId').lean();
}

/**
 * Active therapy case → latest assignment; required to open a thread.
 */
async function resolveTherapistIdForCase(caseId) {
  const tc = await TherapyCase.findOne({ caseId, status: 'active' }).sort({ updatedAt: -1 }).lean();
  if (tc?.therapistId) return tc.therapistId;
  const ha = await HomeAssignment.findOne({ caseId }).sort({ updatedAt: -1 }).lean();
  if (ha?.therapistId) return ha.therapistId;
  return null;
}

function childNameFromParent(parent, childId) {
  if (!parent || !Array.isArray(parent.children) || !childId) return 'Child';
  const found = parent.children.find((c) => c && c._id && c._id.toString() === childId.toString());
  if (!found) return 'Child';
  return `${found.firstName || ''} ${found.lastName || ''}`.trim() || 'Child';
}

/**
 * GET /api/messaging/conversations
 * Inbox: therapist or parent.
 */
exports.listConversations = async (req, res) => {
  try {
    const role = String(req.user?.role ?? req.jwtRole ?? '').toLowerCase();
    const uid = req.user._id;

    let filter;
    if (role === 'therapist') filter = { therapistId: uid };
    else if (role === 'parent') filter = { parentId: uid };
    else {
      return res.status(403).json({ success: false, message: 'Messaging is available for parents and therapists' });
    }

    const list = await Conversation.find(filter).sort({ lastMessageAt: -1 }).lean();
    if (list.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const caseIds = [...new Set(list.map((c) => String(c.caseId)))];
    const cases = await ChildCase.find({ _id: { $in: caseIds } }).select('_id childId parentId').lean();
    const caseMap = new Map(cases.map((c) => [String(c._id), c]));

    const parentIds = [...new Set(cases.map((c) => String(c.parentId)))];
    const parents = await User.find({ _id: { $in: parentIds } })
      .select('firstName lastName children')
      .lean();
    const parentById = new Map(parents.map((p) => [String(p._id), p]));

    const convIds = list.map((c) => c._id);
    const lastMsgs = await Message.aggregate([
      { $match: { conversationId: { $in: convIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          text: { $first: '$text' },
          createdAt: { $first: '$createdAt' },
        },
      },
    ]);
    const lastByConv = new Map(lastMsgs.map((m) => [String(m._id), m]));

    const data = list.map((conv) => {
      const c = caseMap.get(String(conv.caseId));
      const parent = c ? parentById.get(String(c.parentId)) : null;
      const childName = c ? childNameFromParent(parent, c.childId) : 'Child';
      const parentName = parent
        ? `${parent.firstName || ''} ${parent.lastName || ''}`.trim() || 'Parent'
        : 'Parent';
      const last = lastByConv.get(String(conv._id));
      return {
        ...conv,
        childName,
        parentName,
        preview: last ? String(last.text || '').slice(0, 200) : '',
        previewAt: last?.createdAt || conv.lastMessageAt,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (e) {
    console.error('listConversations:', e);
    return res.status(500).json({ success: false, message: 'Failed to load conversations' });
  }
};

/**
 * GET /api/messaging/conversations/:caseId
 * Get or create conversation for a case (parent or therapist with access).
 */
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const role = String(req.user?.role ?? req.jwtRole ?? '').toLowerCase();
    const uid = req.user._id;

    const caseDoc = await ChildCase.findById(caseId).select('_id parentId childId').lean();
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    if (role === 'parent') {
      if (String(caseDoc.parentId) !== String(uid)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (role === 'therapist') {
      const access = await assertTherapistCaseAccess(req, caseId, uid);
      if (!access.ok) {
        return res.status(access.status).json({ success: false, message: access.message });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    const therapistId = await resolveTherapistIdForCase(caseId);
    if (!therapistId) {
      return res.status(400).json({
        success: false,
        message: 'No therapist is linked to this case yet. Start therapy or create an assignment first.',
      });
    }

    let conv = await Conversation.findOne({ caseId }).lean();
    if (!conv) {
      const created = await Conversation.create({
        caseId,
        parentId: caseDoc.parentId,
        therapistId,
        lastMessageAt: new Date(),
      });
      conv = created.toObject();
    } else if (String(conv.therapistId) !== String(therapistId)) {
      await Conversation.updateOne({ _id: conv._id }, { $set: { therapistId } });
      conv = { ...conv, therapistId };
    }

    const parent = await User.findById(caseDoc.parentId).select('firstName lastName children').lean();
    const childName = childNameFromParent(parent, caseDoc.childId);
    const parentName = parent ? `${parent.firstName || ''} ${parent.lastName || ''}`.trim() : 'Parent';

    return res.status(200).json({
      success: true,
      data: {
        ...conv,
        childName,
        parentName,
      },
    });
  } catch (e) {
    console.error('getOrCreateConversation:', e);
    return res.status(500).json({ success: false, message: 'Failed to open conversation' });
  }
};

/**
 * GET /api/messaging/messages/:conversationId
 */
exports.listMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversationId' });
    }

    const conv = await Conversation.findById(conversationId).lean();
    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const role = String(req.user?.role ?? req.jwtRole ?? '').toLowerCase();
    const uid = req.user._id;
    const isParticipant =
      String(conv.parentId) === String(uid) || String(conv.therapistId) === String(uid);
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (role === 'therapist' && String(conv.therapistId) === String(uid)) {
      const access = await assertTherapistCaseAccess(req, conv.caseId, uid);
      if (!access.ok) {
        return res.status(access.status).json({ success: false, message: access.message });
      }
    }
    if (role === 'parent' && String(conv.parentId) !== String(uid)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 }).lean();
    return res.status(200).json({ success: true, data: messages });
  } catch (e) {
    console.error('listMessages:', e);
    return res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
};

/**
 * POST /api/messaging/messages
 * Body: { conversationId, text } — sender from JWT.
 */
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, text } = req.body || {};
    const trimmed = String(text || '').trim();
    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: 'Valid conversationId is required' });
    }
    if (!trimmed) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty' });
    }

    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const role = String(req.user?.role ?? req.jwtRole ?? '').toLowerCase();
    const uid = req.user._id;

    const isTherapist = String(conv.therapistId) === String(uid);
    const isParent = String(conv.parentId) === String(uid);
    if (!isTherapist && !isParent) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (role === 'therapist' && isTherapist) {
      const access = await assertTherapistCaseAccess(req, conv.caseId, uid);
      if (!access.ok) {
        return res.status(access.status).json({ success: false, message: access.message });
      }
    }
    if (role === 'parent' && !isParent) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const msg = await Message.create({
      conversationId: conv._id,
      senderId: uid,
      text: trimmed,
    });

    conv.lastMessageAt = new Date();
    await conv.save();

    return res.status(201).json({ success: true, data: msg.toObject() });
  } catch (e) {
    console.error('sendMessage:', e);
    return res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};
