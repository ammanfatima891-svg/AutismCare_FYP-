/**

 * Therapist case analytics — derived from SessionLog, TherapyPlan, HomeAssignment only.

 * Clinician routes under /api/progress are unchanged.

 */

const mongoose = require('mongoose');

const { ChildCase } = require('../models/ChildCase');

const { Referral } = require('../models/Referral');

const TherapyCase = require('../models/TherapyCase');

const TherapyPlan = require('../models/TherapyPlan');

const SessionLog = require('../models/SessionLog');

const { HomeAssignment } = require('../models/HomeAssignment');

const { resolveTherapistTypes } = require('./referralController');

const { computeProgressEngineForCase } = require('../services/progressEngine');
const { buildUnifiedCaseAnalytics } = require('../services/caseAnalyticsSnapshot');



/**

 * GET /api/analytics/:caseId

 */

exports.getCaseAnalytics = async (req, res) => {

  try {

    const { caseId } = req.params;

    const therapistId = req.user._id;



    if (!mongoose.Types.ObjectId.isValid(caseId)) {

      return res.status(400).json({ success: false, message: 'Invalid case id' });

    }



    /** Must match GET /api/therapist/case/:caseId — same gate as case file. */

    const caseDoc = await ChildCase.findById(caseId).lean();

    if (!caseDoc) {

      return res.status(404).json({ success: false, message: 'Case not found' });

    }



    const therapistTypes = await resolveTherapistTypes(req);

    const therapyCaseActive = await TherapyCase.findOne({ caseId, therapistId, status: 'ACTIVE' }).lean();



    let referral = null;

    if (therapistTypes.length > 0) {

      referral = await Referral.findOne({

        caseId,

        therapistType: { $in: therapistTypes },

        status: { $in: ['CREATED', 'SENT', 'ACCEPTED'] },

      })

        .sort({ updatedAt: -1 })

        .lean();

    }



    if (!therapyCaseActive && !referral) {

      return res.status(403).json({ success: false, message: 'Access denied' });

    }



    const [plan, sessions, assignments] = await Promise.all([

      TherapyPlan.findOne({ caseId, therapistId }).lean(),

      SessionLog.find({ caseId, therapistId }).sort({ sessionDate: 1 }).lean(),

      HomeAssignment.find({ caseId, therapistId }).lean(),

    ]);

    const engineResult = await computeProgressEngineForCase(caseId, { therapistId, useCache: true });
    if (!engineResult.success) {
      return res.status(400).json({ success: false, message: engineResult.message || 'Failed to compute progress' });
    }

    /** Same shape as report generation — legacy charts + stakeholder KPIs + progress engine (see caseAnalyticsSnapshot). */
    const data = buildUnifiedCaseAnalytics(
      { plan, sessions, assignments },
      engineResult.data || null
    );



    return res.status(200).json({

      success: true,

      data,

    });

  } catch (error) {

    console.error('getCaseAnalytics:', error);

    return res.status(500).json({ success: false, message: 'Failed to load analytics' });

  }

};

