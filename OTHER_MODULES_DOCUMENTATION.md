## Other modules documentation (features, expected behavior, readiness)

This document covers **all modules except Therapy**. See `THERAPY_MODULE_DOCUMENTATION.md` for the Therapy module.

---

## 1) Authentication & accounts (`/api/auth/*`)

### Features
- Registration (with document uploads)
- Login (JWT)
- Email verification
- Forgot/reset password

### Expected behavior
- **Register** accepts multipart form-data with up to 10 documents; creates user in pending/active state depending on role rules.
- **Login** returns a JWT; client stores token and uses it for subsequent API calls.
- **Verify email** marks account verified.
- **Password reset** flow issues a token and allows setting a new password.

### Endpoints (backend)
- `POST /api/auth/register` (multipart `documents[]`)
- `POST /api/auth/login`
- `GET /api/auth/verify-email/:token`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/:token`

### Readiness
- **8/10**

### Gaps / risks
- Ensure uploaded registration documents are validated and not publicly exposed beyond intended access.

---

## 2) Admin moderation (`/api/admin/*`)

### Features
- Review pending professionals
- Approve/reject professional accounts (with throttling)

### Endpoints
- `GET /api/admin/pending-professionals`
- `POST /api/admin/update-professional-status`

### Expected behavior
- Only `admin` can access.
- Throttle prevents rapid moderation actions.

### Readiness
- **8/10**

### Gaps / risks
- Consider audit logging for admin actions (approve/reject) if not already present in controller.

---

## 3) Parent child profiles (`/api/child/*`)

### Features
- CRUD for parent’s children

### Endpoints
- `GET /api/child`
- `GET /api/child/:id`
- `POST /api/child`
- `PUT /api/child/:id`
- `DELETE /api/child/:id`

### Expected behavior
- Only authenticated `parent` can access.
- Parent can only manage their own children.

### Readiness
- **8/10**

### Gaps / risks
- Enforce strict ownership checks server-side for all operations.

---

## 4) Screening (questionnaires) (`/api/screening/*`)

### Features
- Submit questionnaire responses and calculate screening result (M-CHAT/ASQ style)
- View screening history and per-child status
- Download screening submission report (PDF)
- Email a report (PDF upload)
- Screening stats (admin/clinician usage)

### Endpoints
- `POST /api/screening/calculate-screening`
- `GET /api/screening/available-questionnaires`
- `GET /api/screening/questionnaires/:type`
- `GET /api/screening/screening-history`
- `GET /api/screening/submission/:id`
- `GET /api/screening/submission/:id/download`
- `GET /api/screening/child/:childId/screening-status`
- `GET /api/screening/stats`
- `GET /api/screening/available-clinicians-therapists`
- `POST /api/screening/send-report` (multipart `pdf`)

### Expected behavior
- Requires login (any role) but behavior differs per role (history is user-scoped).
- Upload for `send-report` only accepts PDFs up to 10MB with friendly JSON error messages.

### Readiness
- **7.5/10**

### Gaps / risks
- Align clinician “decision” statuses with frontend expectations (some integration tests suggest naming drift).
- Standardize status enums and expose them to UI to avoid mismatch.

---

## 5) Facial screening (`/api/facial-screening/*`)

### Features
- Upload a face image and get a prediction (forwarded to ML service)

### Endpoint
- `POST /api/facial-screening/predict` (multipart `image`, jpeg/png/webp, max 5MB)

### Expected behavior
- Requires login (any role)
- Returns prediction payload or validation error

### Readiness
- **7/10**

### Gaps / risks
- Clarify ML service availability and timeouts; add user-facing error handling for service-down scenarios.

---

## 6) Appointments (`/api/appointments/*`)

### Features
- Parent books appointment (with optional documents)
- Professionals (clinician/therapist/lab) manage approval/rejection/reschedule/complete
- Parent can cancel
- Admin overview + stats

### Key endpoints
- Parent:
  - `POST /api/appointments` (multipart `documents[]`)
  - `GET /api/appointments/my`
  - `PUT /api/appointments/:id/cancel`
  - `GET /api/appointments/professionals/:type`
- Professional:
  - `GET /api/appointments/professional`
  - `PUT /api/appointments/:id/approve`
  - `PUT /api/appointments/:id/reject`
  - `PUT /api/appointments/:id/reschedule`
  - `PUT /api/appointments/:id/complete`
- Admin:
  - `GET /api/appointments/all`
  - `GET /api/appointments/stats`

### Expected behavior
- Strong validation of dates, ownership, and transitions.
- Clinician appointment approval can auto-create/sync a `ChildCase` (idempotent).

### Readiness
- **8/10**

### Gaps / risks
- Ensure appointment type-to-role mapping is consistent between UI and backend enums.

---

## 7) Clinician dashboard functions (`/api/clinician/*`, `/api/cases/*`, `/api/evaluations/*`, `/api/referrals/*`)

### Modules under clinician
- **Case management** (`/api/cases`)  
  - List cases, open case, update status, create case, create from appointment
- **Clinical evaluations** (`/api/evaluations`)  
  - Create evaluation, versioning, list by case, development summary
- **Referrals** (`/api/referrals`)  
  - Create referral, list referrals by case
- **Screening reviews** (`/api/clinician/screening-reviews`)  
  - Review submissions and record clinician decision

### Readiness
- **8/10** for case/evaluation/referral flows
- **7/10** for screening review decision flow (status naming drift risk)

---

## 8) Lab module (`/api/lab/*`)

### Features
- Clinician creates lab test request for parent/child
- Lab technician manages requests, uploads reports, updates status
- Clinician releases reports to parent
- Parent views released lab reports

### Endpoints (high level)
- Parent:
  - `GET /api/lab/parent/reports`
- Clinician:
  - `GET /api/lab/clinician/parents`
  - `GET/POST /api/lab/clinician/requests`
  - `GET /api/lab/clinician/requests/:id`
  - `PATCH /api/lab/clinician/requests/:id/release`
- Lab:
  - `GET /api/lab/stats`
  - `GET /api/lab/requests`
  - `GET /api/lab/requests/:id`
  - `PATCH /api/lab/requests/:id/status`
  - `POST /api/lab/reports/upload`
  - `GET /api/lab/reports`
  - `GET /api/lab/reports/:id`

### Readiness
- **8/10**

### Gaps / risks
- Ensure uploads are virus-scanned / type-validated if required for production compliance.

---

## 9) Notifications (`/api/notifications/*`)

### Features
- List notifications
- Unread count
- Mark read / mark all read
- Delete notification

### Endpoints
- `GET /api/notifications`
- `GET /api/notifications/count`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `DELETE /api/notifications/:id`

### Readiness
- **8/10**

---

## 10) Messaging (`/api/messaging/*`)

### Features
- Case-scoped conversations between parent, assigned therapist, and clinician (depending on access rules)
- Send and list messages

### Endpoints
- `GET /api/messaging/conversations`
- `GET /api/messaging/conversations/:caseId` (get or create)
- `GET /api/messaging/messages/:conversationId`
- `POST /api/messaging/messages`

### Readiness
- **7.5/10**

### Gaps / risks
- Add rate limiting / spam protection if exposed publicly.

---

## 11) Activity library (`/api/activities/*`)

### Features
- Therapist CRUD for activities
- Template library CRUD and clone
- Assign activity (case linkage)

### Endpoints (therapist)
- Templates:
  - `GET/POST /api/activities/templates`
  - `PATCH /api/activities/templates/:id`
  - `POST /api/activities/templates/:id/clone`
- Activities:
  - `GET/POST /api/activities`
  - `PATCH /api/activities/:id`
  - `POST /api/activities/:id/clone`
  - `POST /api/activities/:id/assign`

### Readiness
- **8/10**

---

## 12) Scheduling + session slots (`/api/schedules/*`, `/api/sessionslots/*`)

### Features
- Therapist creates recurring schedules per case
- Session slots generated/updated; therapists can update slot status; other roles can view slots by case access

### Endpoints
- Therapist schedules:
  - `POST /api/schedules`
  - `GET /api/schedules/:caseId`
- Session slots:
  - `GET /api/sessionslots/:caseId` (any authenticated user with access)
  - `PATCH /api/sessionslots/:id` (therapist only)

### Readiness
- **7.5/10**

---

## 13) Analytics + integration surfaces (`/api/analytics/*`, `/api/case/*`, `/api/progress-engine/*`, `/api/reports/*`)

### Features
- Case analytics (therapist)
- Case summary + progress panel (all roles with case access)
- Progress engine payload + summary (all roles with case access)
- Reports generation + view + download (therapist generates; role-filtered viewing)

### Readiness
- **8/10** overall

### Gaps / risks
- Ensure UI uses consistent “source of truth” between analytics vs progress-engine vs legacy progress endpoints.

