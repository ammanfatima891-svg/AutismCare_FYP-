/**
 * Rule-based recommendations for parents based on screening results.
 * Aligned with ASQ-3 and M-CHAT-R clinical guidance and best practices.
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
      {
        title: 'Use the platform to book a specialist',
        description: 'You can book an appointment with an approved clinician or therapist from this platform to start the evaluation process.',
        priority: 'optional',
      },
    ],
  },
};

const ASQ3_RECOMMENDATIONS: Record<string, ScreeningRecommendationSet> = {
  Pass: {
    headline: 'Development appears on track for this age',
    summary:
      'Your child’s scores suggest development is within the expected range in the areas screened. Keep supporting growth through play and daily activities.',
    steps: [
      {
        title: 'Continue routine well-child and developmental checks',
        description: 'Attend regular pediatric visits. Your provider will track development at each visit.',
        priority: 'do',
      },
      {
        title: 'Complete the next ASQ-3 when it’s due',
        description: 'ASQ-3 is age-interval based (e.g., 2, 4, 6 months). Complete the next questionnaire when your child reaches the next interval.',
        priority: 'consider',
      },
      {
        title: 'Offer activities across all developmental areas',
        description: 'Include communication (talking, reading), movement (playground, dancing), fine motor (stacking, drawing), problem-solving (puzzles, cause-and-effect toys), and social play.',
        priority: 'optional',
      },
    ],
  },
  Monitor: {
    headline: 'Some areas may benefit from extra attention',
    summary:
      'One or more areas suggest monitoring or extra support. This is common and does not mean something is wrong—it means watching and supporting those skills can help.',
    steps: [
      {
        title: 'Share results with your pediatrician',
        description: 'Discuss which domains were “monitor” so they can advise on activities or follow-up screening.',
        priority: 'do',
      },
      {
        title: 'Re-screen at the next ASQ-3 interval',
        description: 'Complete the next age-interval ASQ-3 as recommended. Scores can improve with time and targeted activities.',
        priority: 'do',
      },
      {
        title: 'Focus on the areas that need monitoring',
        description: 'Use the domain-specific tips below to support your child in areas that were flagged. Small, daily activities often help the most.',
        priority: 'consider',
      },
      {
        title: 'Consider a developmental check if concerns grow',
        description: 'If you notice ongoing difficulties in a specific area, ask your provider for a developmental check or referral.',
        priority: 'optional',
      },
    ],
  },
  Fail: {
    headline: 'Further developmental evaluation is recommended',
    summary:
      'Scores suggest that a fuller developmental evaluation would be helpful. Early evaluation helps identify strengths and any need for early intervention or therapy.',
    steps: [
      {
        title: 'Request a developmental evaluation',
        description: 'Ask your pediatrician for a referral to a developmental specialist or early intervention program. Bring this report and your observations.',
        priority: 'do',
      },
      {
        title: 'Share domain results with the specialist',
        description: 'The areas marked “referral” (see domain scores above) show where evaluation may focus. This helps the specialist plan the assessment.',
        priority: 'do',
      },
      {
        title: 'Support development at home while waiting',
        description: 'Use the domain-specific tips below to encourage skills in areas of concern. Early intervention often includes parent coaching and home activities.',
        priority: 'consider',
      },
      {
        title: 'Book a clinician or therapist on this platform',
        description: 'You can schedule an appointment with an approved clinician or therapist here to start the evaluation process.',
        priority: 'optional',
      },
    ],
  },
};

/** Domain-specific tips for ASQ-3 when a domain needs monitoring or referral */
export const ASQ3_DOMAIN_TIPS: Record<string, { monitoring: string; referral: string }> = {
  Communication: {
    monitoring:
      'Talk and read with your child daily. Name objects, sing songs, and encourage sounds and words. Respond when they point or make sounds.',
    referral:
      'Consider a hearing check and a speech-language evaluation. Use simple words, gestures, and pictures. Repeat and expand on what your child says.',
  },
  'Gross Motor': {
    monitoring:
      'Give plenty of safe space to move: tummy time, crawling, walking, and running. Play ball, dance, and use playground equipment when age-appropriate.',
    referral:
      'Ask your pediatrician about a physical therapy or developmental evaluation. Encourage movement through play and avoid long periods in seats or carriers.',
  },
  'Fine Motor': {
    monitoring:
      'Offer crayons, blocks, and safe small objects to grasp. Practice stacking, scribbling, and self-feeding with fingers or spoons.',
    referral:
      'An occupational or developmental evaluation can help. Provide varied textures and activities that use the hands, and break tasks into small steps.',
  },
  'Problem Solving': {
    monitoring:
      'Play simple puzzles, shape sorters, and cause-and-effect toys. Let your child try and make mistakes; offer help when they’re stuck.',
    referral:
      'Evaluation can identify strengths and needs. Use simple, step-by-step play and real-life problem-solving (e.g., finding a toy, opening a container).',
  },
  'Personal-Social': {
    monitoring:
      'Play face-to-face, copy your child’s sounds and actions, and take turns. Arrange short playdates or family playtime to practice social skills.',
    referral:
      'A developmental or behavioral evaluation can guide next steps. Focus on turn-taking, shared attention, and simple social games at home.',
  },
};

function normalizeResult(results: {
  result?: string;
  riskLevel?: string;
}): ResultLevel {
  const r = results.result ?? results.riskLevel;
  if (r === 'Pass' || r === 'low') return 'Pass';
  if (r === 'Monitor' || r === 'medium') return 'Monitor';
  if (r === 'Fail' || r === 'high') return 'Fail';
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

  const resultKey = normalizeResult(results);
  const base = isMCHAT
    ? MCHAT_RECOMMENDATIONS[resultKey]
    : isASQ3
      ? ASQ3_RECOMMENDATIONS[resultKey]
      : MCHAT_RECOMMENDATIONS[resultKey]; // fallback

  const out: ScreeningRecommendationSet = {
    headline: base.headline,
    summary: base.summary,
    steps: [...base.steps],
  };

  // Add domain-specific tips for ASQ-3 when we have domain statuses
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
