## Unified system documentation (all modules)

This document unifies:
- `THERAPY_MODULE_DOCUMENTATION.md`
- `OTHER_MODULES_DOCUMENTATION.md`

It describes the system as a set of connected modules, including cross-module flows and readiness/gaps.

Additional deliverables:
- `SYSTEM_QA_CHECKLIST.md` (testable acceptance criteria)
- `SYSTEM_ARCHITECTURE.md` (Mermaid diagram)

---

## Modules (system map)

### Identity & governance
- **Auth & accounts**: `/api/auth/*`
- **Admin moderation**: `/api/admin/*`

### Care delivery & records
- **Child profiles (parent)**: `/api/child/*`
- **Appointments**: `/api/appointments/*`
- **Cases (clinician)**: `/api/cases/*`
- **Clinical evaluations (clinician)**: `/api/evaluations/*`
- **Referrals (clinician → therapist)**: `/api/referrals/*`
- **Therapy module (therapist + clinician oversight + parent loop)**: see `THERAPY_MODULE_DOCUMENTATION.md`

### Screening & decision support
- **Questionnaire screening**: `/api/screening/*`
- **Facial screening**: `/api/facial-screening/*`
- **Clinician screening review**: `/api/clinician/screening-reviews/*`

### Lab workflow
- **Lab requests/reports**: `/api/lab/*`

### Communication & engagement
- **Messaging**: `/api/messaging/*`
- **Notifications**: `/api/notifications/*`

### Analytics & reporting
- **Therapist analytics**: `/api/analytics/*`
- **Integration case panels**: `/api/case/:caseId/summary|progress`
- **Progress engine**: `/api/progress-engine/*`
- **Reports**: `/api/reports/*`

### Operations support
- **Activity library (therapist)**: `/api/activities/*`
- **Scheduling + slots**: `/api/schedules/*`, `/api/sessionslots/*`

---

## Core end-to-end user journeys (expected behavior)

### Journey A — Parent → clinician → case creation
1) Parent registers/login, creates a child profile.
2) Parent books a diagnostic appointment with a clinician.
3) Clinician approves appointment; system auto-creates (or syncs) a `ChildCase`.
4) Clinician opens case, completes a clinical evaluation, and finalizes it.

**Success signals**
- Case is visible under clinician “Child Cases”
- Evaluation appears under case and can be versioned

**Dependencies**
- Auth, child profiles, appointments, cases, evaluations, notifications

### Journey B — Clinician referral → therapist starts therapy
1) Clinician creates a referral for an owned case (requires final evaluation).
2) Therapist sees the referral (specialization mapping), accepts it, starts therapy.
3) Starting therapy creates/updates a `TherapyCase(status="active")` and unlocks therapy plan/session work.

**Success signals**
- Therapist can open `/therapist/case/:caseId`
- Therapy plan creation allowed only after therapy start

**Dependencies**
- Referrals, therapy-case activation, therapist case file access control

### Journey C — Therapist care loop (plan → sessions → home → progress → reports)
1) Therapist creates or updates therapy plan (draft then submit).
2) Therapist logs sessions with goalData.
3) Therapist assigns home activities; parent submits evidence.
4) Therapist reviews evidence and rates; adherence affects progress.
5) Clinician/parent can view progress summary; therapist generates reports and downloads PDFs.

**Success signals**
- Progress engine reflects plan+sessions+assignments consistently
- Reports render in UI and PDFs download successfully

**Dependencies**
- Therapy plan, sessions, assignments, progress engine, reports, messaging/notifications

### Journey D — Lab workflow (clinician → lab → parent)
1) Clinician creates lab test request.
2) Lab uploads report and updates status.
3) Clinician releases report to parent.
4) Parent views lab report.

**Dependencies**
- Lab module, notifications, uploads, access control

---

## Readiness overview (feature-wise)

### Ready for demo / end-to-end flows
- Auth, role-based dashboards, case creation (via clinician), referrals to therapy, therapy plan/session loop, assignments, reports list & download.

### Needs attention (gaps / risks)
- **Screening review status naming drift**: integration tests indicate expected statuses may not match responses.
- **Report PDFs**: “generic” PDFs are JSON dumps; upgrade templates if intended for real stakeholder sharing.
- **Consistency across analytics**: multiple “progress” surfaces exist (`/progress`, `/progress-engine`, `/analytics`, `/case/:id/progress`). Ensure UI uses the intended source consistently.
- **Security hardening**: rate limits for messaging, upload validation expectations, and audit logs for sensitive admin actions.

---

## Recommended “next best” improvements (highest ROI)
- Standardize enums/status strings across backend + frontend for:
  - screening decisions
  - report types
  - appointment types/statuses
- Add 2–3 Playwright E2E tests for:
  - parent home assignment submit → therapist review → parent complete
  - lab request → upload report → clinician release → parent view
- Improve PDF templates for clinician/parent-facing reports (not JSON).

