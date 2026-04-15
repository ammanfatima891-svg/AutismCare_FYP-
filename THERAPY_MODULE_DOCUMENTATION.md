## Therapy module documentation (features, expected behavior, readiness)

### Scope
This document describes the end‑to‑end **Therapy module** across **Therapist**, **Clinician**, and **Parent** roles:
- Features that exist
- Expected behavior and inputs/outputs
- Readiness rating
- Known gaps / inconsistencies

---

## Architecture overview (how it’s supposed to work)

### Primary entities
- **`ChildCase`**: the core case file (links clinician, parent, child).
- **`Referral`**: clinician → therapist handoff (pending → accepted → in-progress).
- **`TherapyCase`**: activation record created when therapist starts therapy (status `active`).
- **`TherapyPlan`**: domains, long‑term goal, short‑term goals (+ mastery rules), activities.
- **`SessionLog`**: therapist session documentation (goalData enables high-quality analytics).
- **`HomeAssignment`**: home practice activities + parent evidence submission + therapist feedback.
- **`Report`**: generated read-only report snapshots + on-demand PDF.

### Key backend APIs (confirmed routes)
- **Referrals**: `server/src/routes/referralRoutes.js`
  - `POST /api/referrals` (clinician)
  - `GET /api/referrals/case/:caseId` (clinician)
  - `GET /api/referrals/assigned` (therapist)
  - `PATCH /api/referrals/:id/accept` (therapist)
  - `PATCH /api/referrals/:id/start` (therapist)
- **Therapist module**: `server/src/routes/therapist.routes.js`
  - `PATCH /api/therapist/referrals/:id/start-therapy` (alias for start)
  - `POST /api/therapist/recommendations`
  - `GET /api/therapist/case/:caseId` (aggregated case file)
  - `POST/GET /api/therapist/cases/:caseId/assignments` (case scoped)
- **Therapy plan**: `server/src/routes/therapyPlanRoutes.js`
  - `GET/POST /api/therapy-plan`
  - `GET /api/therapy-plan/:caseId`
  - `PATCH /api/therapy-plan/:id`
  - `POST /api/therapy-plan/assign`
  - `POST /api/therapy-plan/submit-for-approval/:planId`
  - `POST /api/therapy-plan/duplicate`, `POST /api/therapy-plan/:id/duplicate`
- **Sessions**: `server/src/routes/sessionRoutes.js`
  - `GET/POST /api/sessions`
  - `GET /api/sessions/case/:caseId` (alias)
  - `PATCH /api/sessions/:id`
  - `PATCH /api/sessions/:id/sign`
- **Assignments (global therapist view)**: `server/src/routes/homeAssignmentRoutes.js`
  - `GET /api/assignments`
  - `GET /api/assignments/summary`
  - `POST /api/assignments`
  - `PATCH /api/assignments/:id/review`
- **Clinician oversight (therapy)**: `server/src/routes/therapyRoutes.js`
  - `GET /api/therapy/:caseId/plan|sessions|goals|notes`
  - `POST /api/therapy/:caseId/notes`
- **Clinician progress**: `server/src/routes/progressRoutes.js`
  - `GET /api/progress/:caseId/overview|sessions`
  - `GET /api/progress/:caseId/domain/:domain`
- **Reports**: `server/src/routes/reportRoutes.js`
  - `POST /api/reports` (generate)
  - `POST /api/reports/generate/:caseId` (integrated)
  - `GET /api/reports` (therapist list)
  - `GET /api/reports/view/:id`
  - `GET /api/reports/:reportId/download`

---

## Feature inventory (with expected behavior + readiness)

### 1) Referral → therapist starts therapy
- **Role**: clinician + therapist
- **Expected behavior**
  - Clinician can create referral only if a **final clinical evaluation exists**.
  - Therapist can accept referral and start therapy.
  - Start therapy creates/updates `TherapyCase` with status `active`.
- **Inputs**
  - `POST /api/referrals`: `{ caseId, therapistType, priority, notes? }`
  - `PATCH /api/referrals/:id/accept` (no body)
  - `PATCH /api/referrals/:id/start` (no body)
- **Outputs**
  - Referral status transitions: `pending → accepted → in-progress`
  - Start response includes `therapyCase` object.
- **Readiness**: **9/10**
- **Gaps**
  - None critical; relies on specialization mapping for therapist assignment.

### 2) Therapist case file (tabbed workspace)
- **Role**: therapist
- **Expected behavior**
  - Single endpoint returns child + parent + referral + plan + sessions + assignments + labs.
  - UI uses tabs: Overview, Plans, Sessions, Schedule, Assigned Activity, Home assignments, Progress, Reports, Lab.
- **Inputs**: `GET /api/therapist/case/:caseId`
- **Outputs**: aggregated `data` payload.
- **Readiness**: **9/10**
- **Gaps**
  - Ensure access logic stays aligned with referral status + active therapy.

### 3) Therapy plan builder (domains + goals + activities)
- **Role**: therapist
- **Expected behavior**
  - Save draft anytime.
  - Submit enforces required fields: at least 1 domain, long-term title, ≥1 short-term goal with measurable criteria.
  - Assigning a plan to the case child finalizes if valid.
- **Inputs**
  - `POST /api/therapy-plan` / `PATCH /api/therapy-plan/:id`
  - Payload includes `domains`, `longTermGoal`, `shortTermGoals` (mastery rules), optional `activities`.
- **Outputs**
  - Stored `TherapyPlan` and cache invalidations for analytics.
- **Readiness**: **8.5/10**
- **Gaps**
  - “Plan approval” UI/flow depends on clinician approval routes; ensure clinician approval endpoint exists and is connected in UI.

### 4) Session logging (create/edit/sign)
- **Role**: therapist
- **Expected behavior**
  - Session create/update validates goals/activities against the plan.
  - `goalData` drives progress engine accuracy.
  - Signing sets `noteState="signed"` (and can lock later depending on workflow).
- **Inputs**
  - `POST /api/sessions`: `{ caseId, sessionDate, duration, goalsTargeted[], activitiesUsed[], childResponse, goalData? ... }`
  - `PATCH /api/sessions/:id`, `PATCH /api/sessions/:id/sign`
- **Readiness**: **8/10**
- **Gaps**
  - Ensure UI always encourages/collects goalData where possible.

### 5) Home assignments (therapist ↔ parent loop)
- **Role**: therapist + parent
- **Expected behavior**
  - Therapist assigns activity with due date (from library or custom).
  - Parent submits evidence (upload or URL).
  - Therapist reviews feedback + rating, parent can then complete.
- **Inputs**
  - Therapist create: `POST /api/therapist/cases/:caseId/assignments` or `POST /api/assignments`
  - Parent submit: `PATCH /api/parent/assignments/:id/submit` (multipart or JSON URL)
  - Therapist review: `PATCH /api/assignments/:id/review`
  - Parent complete: `PATCH /api/parent/assignments/:id/complete`
- **Readiness**: **8.5/10**
- **Gaps**
  - UX polish: clear status transitions and evidence preview across roles.

### 6) Progress engine + clinician progress monitoring
- **Role**: clinician (+ therapist analytics pages)
- **Expected behavior**
  - Progress is computed from plan + sessions + assignments.
  - Domain/goal trends + alerts are derived consistently.
- **How it works**
  - `server/src/services/progressEngine.js` builds a unified payload (overallScore, goals, domains, weeklyTrend, alerts).
  - Clinician endpoints in `server/src/controllers/progressController.js` include `progressEngine` inside overview payload.
- **Readiness**: **8/10**
- **Gaps**
  - Ensure front-end charts use the intended fields (progressEngine vs legacy analytics) consistently.

### 7) Reports (generated snapshots + PDF)
- **Role**: therapist generates; parent/clinician view filtered types
- **Expected behavior**
  - Therapist can generate multiple report types; integrated report uses progress engine.
  - PDF is generated on first download and cached to `Report.pdfRelativePath`.
- **Readiness**: **7.5/10**
- **Gaps**
  - PDF output is currently “simple clinical PDF” (integrated) or JSON dump (generic). If the product expects formatted, stakeholder-ready PDFs, enhance templates.

### 8) Therapist recommendations (consistency fix applied)
- **Role**: therapist
- **Expected behavior**
  - Therapist can write recommendation notes for a child only if therapist has an **active therapy case** for that child.
  - Stored as `ClinicianNotes` with a `[Therapist Recommendation] ...` prefix.
- **Inputs**
  - `POST /api/therapist/recommendations`: `{ childId, recommendation, therapyType?, frequency?, duration? }`
- **Readiness**: **8/10**
- **Gap fixed**
  - Frontend previously posted to a non-existent appointment endpoint; now aligned to `/api/therapist/recommendations`.

---

## Consistency & readiness summary

### What’s consistent now
- Therapy plan, sessions, assignments, referrals, reports: **frontend routes match backend routes**.
- E2E browser workflow passes: referral → accept → start therapy → open case file → therapy plans UI.
- Therapy recommendation endpoint wiring is now consistent.

### Remaining feature gaps / recommendations
- **Recommendation UI placement**: `TherapyRecommendationForm` exists but isn’t imported/used anywhere in UI yet. Consider adding it to:
  - Case file Overview tab, or
  - Sessions tab post-session “Add recommendation” action, or
  - Reports tab context actions.
- **PDF quality**: generic report PDFs are JSON; upgrade to proper templates if intended for real clinical sharing.
- **Analytics alignment**: ensure all analytics pages use either progress-engine payload or legacy analytics consistently (avoid mixed interpretations).

