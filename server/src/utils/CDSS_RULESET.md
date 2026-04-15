## AutismCare CDSS — Hybrid rule set (suggestions only)

This rule set is designed to be **conservative**, **transparent**, and **non-prescriptive**. It does **not** diagnose; it produces guidance and referral suggestions that clinicians can accept, edit, or ignore.

### Evidence / guidance sources (hybrid)
- **M-CHAT-R/F (official)**: Scoring + action table (low/medium/high risk) and recommendation to refer for **early intervention** + **diagnostic evaluation** on positive screens. Source: `https://www.mchatscreen.com/mchat-rf/scoring/`
- **ASQ-3 (Ages & Stages)**: Monitoring zone guidance (activities + rescreen sooner) and referral guidance (“below cutoff” → evaluate). Sources:
  - `https://agesandstages.com/wp-content/uploads/2018/09/ASQ-Referral-Tips.pdf`
  - `https://agesandstages.com/free-resources/articles/kids-in-the-monitoring-zone/`
  - `https://agesandstages.com/wp-content/uploads/2018/02/interpretingresults_slidepresentation_020818.pdf`
- **NICE CG128 (Under 19s — recognition/referral/diagnosis)**: Referral pathway to a multidisciplinary autism team and assessment of coexisting conditions. Source: `https://www.nice.org.uk/guidance/cg128`
- **NICE CG170 (Under 19s — support/management)**: Intervention categories, social-communication interventions, parent-mediated supports, and “do not use” interventions. Source: `https://www.nice.org.uk/guidance/cg170/chapter/1-recommendations`
- **AAP ASD clinical report (2020)**: High-level practice guidance on identification/evaluation/management including not waiting to start services after elevated likelihood and considering audiology. Source: `https://publications.aap.org/pediatrics/article/145/1/e20193447/36917/Identification-Evaluation-and-Management-of`
- **CDC autism treatment**: Therapy categories (behavioral, developmental, educational, social-relational). Source: `https://www.cdc.gov/autism/treatment/index.html`
- **ASHA Late Language Emergence**: Language delay evaluation includes hearing screening/audiology assessment and SLP evaluation. Source: `https://www.asha.org/practice-portal/clinical-topics/late-language-emergence/`
- **AAP hearing assessment beyond neonatal screening**: Caregiver concern about speech/language/development prompts hearing referral. Source: `https://publications.aap.org/pediatrics/article/152/3/e2023063288/193755/Hearing-Assessment-in-Infants-Children-and`
- **NICE NG217 (Epilepsy)**: Urgent specialist referral for first suspected seizure / epilepsy assessment (general guidance). Source: `https://www.nice.org.uk/guidance/ng217/chapter/1-Diagnosis-and-assessment-of-epilepsy`
- **USPSTF ASD screening (context)**: “Insufficient evidence” for universal screening in asymptomatic children — reinforces suggestion-based CDSS framing. Source: `https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/autism-spectrum-disorder-in-young-children-screening`

### Decision outputs
- **referralRequired**: “strong trigger” (e.g., ASD Level 2/3, M-CHAT high risk, epilepsy)
- **suggestFurtherTesting**: additional testing/assessment recommended (e.g., low confidence, M-CHAT moderate risk, ASQ monitoring)
- **suggestedSpecialists**: list of suggested referral pathways (editable in UI)
- **reasons**: transparent explanation strings (for auditability and UI display)

### Rule table (high-level)

#### ASD-specific
- If **Primary diagnosis = ASD** AND **Severity = Level 2 or 3**
  - referralRequired = true
  - suggestedSpecialists include Speech Therapist, Behavioral Therapist, Occupational Therapist
- If **Primary diagnosis = ASD** AND **Severity = Level 1 or unspecified**
  - referralRequired = false
  - suggestedSpecialists include Speech Therapist, Parent Training
  - suggestFurtherTesting = true (diagnostic pathway may still be appropriate)

#### M-CHAT (from stored submissions)
- If **M-CHAT riskLevel = high** OR **result = Fail**
  - referralRequired = true
  - suggestedSpecialists include Further Testing (diagnostic evaluation), Early Intervention
- If **M-CHAT riskLevel = medium** OR **result = Monitor**
  - suggestFurtherTesting = true
  - reason: follow-up interview / rescreening guidance

#### ASQ-3 (from stored submissions)
- If any domain label indicates **“At risk” / “Further evaluation”**
  - suggestFurtherTesting = true
  - suggestedSpecialists include Early Intervention, Further Testing
- If any domain label indicates **monitoring**
  - suggestFurtherTesting = true
  - reason: activities + rescreen (typically 2–3 months)

#### Speech/language pathway (hybrid)
- If **Primary diagnosis = Speech Delay** OR observation includes “Delayed Speech”
  - suggestedSpecialists include Speech Therapist and Audiologist

#### Comorbidities
- If comorbid includes **Epilepsy**
  - referralRequired = true
  - suggestedSpecialists include Pediatric Neurologist
- If comorbid includes **Anxiety**
  - suggestedSpecialists include Child Psychologist (functionally impairing anxiety)
- If comorbid includes **ADHD** (or primary ADHD)
  - suggestFurtherTesting = true
  - suggestedSpecialists include Further Testing

### Implementation
Rules are implemented in `server/src/utils/decisionEngine.js` and mirrored in the frontend so the UI matches what is stored on finalize.

