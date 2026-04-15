/**
 * Rule-based recommendations for parents based on screening results.
 * M-CHAT-R: likelihood-based. ASQ-3: domain-based developmental screening (no single "risk" score in parent copy).
 */

export type ResultLevel = 'Pass' | 'Monitor' | 'Fail';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface RecommendationItem {
  title: string;
  description: string;
  priority: 'do' | 'consider' | 'optional';
}

export interface ScreeningRecommendationSet {
  headline: string;
  summary: string;
  steps: RecommendationItem[];
  domainTips?: { domain: string; tip: string }[];
}

const MCHAT_RECOMMENDATIONS: Record<string, ScreeningRecommendationSet> = {
  Pass: {
    headline: 'No follow-up needed from this screening',
    summary:
      'Your child’s answers suggest a low likelihood of autism at this time. This is a screening only, not a diagnosis. Continue routine care and watch development.',
    steps: [
      {
        title: 'Keep up with well-child visits',
        description: 'Attend regular checkups with your pediatrician. They will monitor growth and development.',
        priority: 'do',
      },
      {
        title: 'Rescreen at 24 months if under 2',
        description: 'If your child is under 24 months, consider repeating the M-CHAT-R around age 2, as recommended by the American Academy of Pediatrics.',
        priority: 'consider',
      },
      {
        title: 'Support social and communication skills at home',
        description: 'Talk, read, and play with your child daily. Name objects, follow their interests, and encourage back-and-forth interaction.',
        priority: 'optional',
      },
      {
        title: 'Trust your instincts',
        description: 'If you ever have concerns about how your child plays, communicates, or interacts, talk to your pediatrician—screening results don’t replace your observations.',
        priority: 'optional',
      },
    ],
  },
  Monitor: {
    headline: 'Follow-up is recommended',
    summary:
      'Some answers suggest it would be helpful to have a follow-up discussion with a professional. This does not mean your child has autism; it means further conversation or a follow-up screen can clarify next steps.',
    steps: [
      {
        title: 'Discuss results with your pediatrician',
        description: 'Share this screening result at your next visit. They can do a follow-up interview (M-CHAT-R/F) or suggest developmental monitoring.',
        priority: 'do',
      },
      {
        title: 'Schedule a well-child visit if one isn’t soon',
        description: 'If the next checkup is more than 1–2 months away, consider calling to schedule a visit to discuss development.',
        priority: 'do',
      },
      {
        title: 'Note any specific concerns',
        description: 'Write down situations or behaviors that worry you (e.g., eye contact, pointing, response to name) so you can share them with the doctor.',
        priority: 'consider',
      },
      {
        title: 'Re-screen in a few months if advised',
        description: 'Your provider may suggest repeating the M-CHAT-R after a short period to see if patterns change.',
        priority: 'consider',
      },
    ],
  },
  Fail: {
    headline: 'Further evaluation is recommended',
    summary:
      'The screening suggests your child may benefit from a fuller developmental evaluation. This is not a diagnosis of autism—evaluation helps identify strengths, needs, and whether early supports would help.',
    steps: [
      {
        title: 'Schedule an evaluation with a professional',
        description: 'Ask your pediatrician for a referral to a developmental pediatrician, psychologist, or autism specialist. Early evaluation leads to earlier support if needed.',
        priority: 'do',
      },
      {
        title: 'Share this report with your pediatrician',
        description: 'Bring a copy of this screening result and any notes about your child’s behavior to the next appointment.',
        priority: 'do',
      },
      {
        title: 'Keep a short log of behaviors',
        description: 'Note examples of social communication, play, and any repetitive or sensory behaviors. These help the specialist understand your child.',
        priority: 'consider',
      },
      {
        title: 'Keep routines and stay calm',
        description: 'Stable routines and a calm environment help your child. Avoid big changes while you wait for the evaluation.',
        priority: 'consider',
      },
    ],
  },
};

/** Shorter parent-facing ASQ-3 copy; tier is derived from domains, not an overall pass/fail score. */
const ASQ3_RECOMMENDATIONS: Record<string, ScreeningRecommendationSet> = {
  Pass: {
    headline: 'Skills look on track for this age',
    summary: 'Each area below is in the expected range. ASQ-3 looks at five developmental areas separately—not one overall grade.',
    steps: [
      {
        title: 'Keep regular checkups',
        description: 'Your pediatrician continues to track growth and development.',
        priority: 'do',
      },
      {
        title: 'Do the next ASQ when it’s due',
        description: 'Questionnaires are repeated at the next age interval.',
        priority: 'consider',
      },
    ],
  },
  Monitor: {
    headline: 'One or more areas: watch and support',
    summary: 'Some scores are in the “monitoring” range. That means extra practice and a chat with your doctor—not a diagnosis.',
    steps: [
      {
        title: 'Tell your pediatrician',
        description: 'Ask which areas to focus on and when to repeat the screen.',
        priority: 'do',
      },
      {
        title: 'Try the short ideas below',
        description: 'Small daily play activities in flagged areas often help.',
        priority: 'consider',
      },
    ],
  },
  Fail: {
    headline: 'One or more areas: follow up with your doctor',
    summary: 'A score below the cutoff in any area means a developmental check is a good next step. Your child may be doing well in other areas at the same time.',
    steps: [
      {
        title: 'Book a visit for next steps',
        description: 'Ask your pediatrician about evaluation or early intervention. Bring this screen and your notes.',
        priority: 'do',
      },
      {
        title: 'Focus on the areas marked below',
        description: 'The list shows which skills to discuss first.',
        priority: 'do',
      },
    ],
  },
};

/** Shorter tips for expandable “ideas” on ASQ-3 parent results */
export const ASQ3_DOMAIN_TIPS: Record<string, { monitoring: string; referral: string }> = {
  Communication: {
    monitoring: 'Talk and read daily; name things; respond when your child points or sounds.',
    referral: 'Ask about hearing and speech-language follow-up; use simple words and gestures.',
  },
  'Gross Motor': {
    monitoring: 'Safe space to move, ball play, playground time when age-appropriate.',
    referral: 'Ask your doctor if PT or a developmental check is advised.',
  },
  'Fine Motor': {
    monitoring: 'Crayons, blocks, stacking, finger foods.',
    referral: 'Ask if OT or developmental evaluation would help.',
  },
  'Problem Solving': {
    monitoring: 'Simple puzzles, cause-and-effect toys; let them try before helping.',
    referral: 'A developmental visit can sort strengths from tricky spots.',
  },
  'Personal-Social': {
    monitoring: 'Face-to-face play, copying, short turn-taking games.',
    referral: 'Ask about developmental or behavioral follow-up if concerns continue.',
  },
};

function normalizeMchatResult(results: { result?: string; riskLevel?: string }): ResultLevel {
  const r = results.result ?? results.riskLevel;
  if (r === 'Pass' || r === 'low') return 'Pass';
  if (r === 'Monitor' || r === 'medium') return 'Monitor';
  if (r === 'Fail' || r === 'high') return 'Fail';
  return 'Pass';
}

/**
 * ASQ-3: pick parent-message tier from domain statuses only (ignores aggregate riskLevel so we don’t mislabel).
 */
export function asqTierFromDomainStatuses(domainStatuses?: Record<string, string>): ResultLevel {
  if (!domainStatuses || Object.keys(domainStatuses).length === 0) {
    return 'Pass';
  }
  const values = Object.values(domainStatuses);
  if (values.some((s) => s === 'referral for further evaluation')) return 'Fail';
  if (values.some((s) => s === 'need monitoring')) return 'Monitor';
  return 'Pass';
}

/**
 * Get rule-based recommendations for parents based on screening type and results.
 */
export function getScreeningRecommendations(
  screeningType: string,
  results: {
    result?: string;
    riskLevel?: string;
    scores?: {
      domainStatuses?: Record<string, string>;
    };
  }
): ScreeningRecommendationSet {
  const isMCHAT = screeningType === 'M-CHAT-R' || screeningType === 'MCHAT-R';
  const isASQ3 = screeningType === 'ASQ-3';

  const resultKey = isASQ3
    ? asqTierFromDomainStatuses(results.scores?.domainStatuses)
    : normalizeMchatResult(results);

  const base = isMCHAT
    ? MCHAT_RECOMMENDATIONS[resultKey]
    : isASQ3
      ? ASQ3_RECOMMENDATIONS[resultKey]
      : MCHAT_RECOMMENDATIONS[resultKey];

  const out: ScreeningRecommendationSet = {
    headline: base.headline,
    summary: base.summary,
    steps: [...base.steps],
  };

  if (isASQ3 && results.scores?.domainStatuses && ASQ3_DOMAIN_TIPS) {
    const domainTips: { domain: string; tip: string }[] = [];
    for (const [domain, status] of Object.entries(results.scores.domainStatuses)) {
      const tips = ASQ3_DOMAIN_TIPS[domain];
      if (!tips) continue;
      if (status === 'need monitoring') {
        domainTips.push({ domain, tip: tips.monitoring });
      } else if (status === 'referral for further evaluation') {
        domainTips.push({ domain, tip: tips.referral });
      }
    }
    if (domainTips.length > 0) {
      out.domainTips = domainTips;
    }
  }

  return out;
}
