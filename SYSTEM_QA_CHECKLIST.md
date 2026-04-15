## System QA checklist (all modules)

Use this as an execution checklist in Postman + browser. Each item includes **expected result**.

---

## A) Auth & role access
- [ ] **Register (parent/clinician/therapist/lab/admin as applicable)**
  - Expected: account created; if email verification required, user is blocked until verified.
- [ ] **Login**
  - Expected: receives JWT; subsequent API calls succeed with `Authorization: Bearer <token>`.
- [ ] **Role route guards**
  - Expected: parent cannot open clinician/therapist/lab dashboards; clinician cannot open therapist dashboard; etc.

---

## B) Admin moderation
- [ ] **List pending professionals**
  - Expected: admin sees pending clinicians/therapists (and/or labs, depending on rules).
- [ ] **Approve/reject professional**
  - Expected: approvalStatus updated; user can access their dashboard when approved.
- [ ] **Throttle**
  - Expected: too many moderation calls quickly returns 429.

---

## C) Parent child profiles
- [ ] **Create child**
  - Expected: child appears in My Children list; server enforces ownership.
- [ ] **Edit child**
  - Expected: updates persist; other parents cannot read/modify.
- [ ] **Delete child**
  - Expected: child removed; references handled gracefully.

---

## D) Appointments
- [ ] **Parent books appointment**
  - Expected: appointment created; documents accepted (jpeg/jpg/png/pdf/doc/docx); professional notified.
- [ ] **Professional approves**
  - Expected: status becomes Approved; clinician approval auto-syncs/creates ChildCase.
- [ ] **Professional rejects**
  - Expected: requires rejectionReason; parent notified.
- [ ] **Reschedule**
  - Expected: validates future date/time; conflict detection works.
- [ ] **Complete**
  - Expected: status becomes Completed; clinician notified when therapy appointment completed (progress updated signal).
- [ ] **Parent cancel**
  - Expected: allowed only for allowed statuses; notification emitted.
- [ ] **Admin stats**
  - Expected: counts by type/status/role; no server errors.

---

## E) Clinician cases + evaluations + referrals
- [ ] **Cases list**
  - Expected: clinician sees only their cases; can open case detail.
- [ ] **Create case (manual)**
  - Expected: case created for (parentId, childId).
- [ ] **Evaluation create (draft + final)**
  - Expected: draft saves; final required fields validated; ownership enforced.
- [ ] **Evaluation versioning**
  - Expected: PATCH creates new version or updates version per controller behavior.
- [ ] **Referral create (requires final eval)**
  - Expected: without final eval returns 400; with final eval creates pending referral.

---

## F) Therapy module (therapist + clinician oversight + parent loop)
See `THERAPY_MODULE_DOCUMENTATION.md` for details; key QA items:
- [ ] **Therapist accepts referral and starts therapy**
  - Expected: therapy case becomes active; therapist can open case file.
- [ ] **Therapy plan draft + submit validation**
  - Expected: submit requires domain + long-term title + at least one short-term goal with measurable criteria.
- [ ] **Session log create/edit/sign**
  - Expected: validates against plan; sign updates noteState.
- [ ] **Home assignment create → parent evidence submit → therapist review → parent complete**
  - Expected: status transitions `pending → submitted → reviewed → completed`.
- [ ] **Therapist recommendation**
  - Expected: `POST /api/therapist/recommendations` works only for active therapy cases.
- [ ] **Reports generate + view + download**
  - Expected: report record created; PDF downloads successfully.

---

## G) Screening (questionnaires)
- [ ] **Fetch questionnaires**
  - Expected: available questionnaires list returns.
- [ ] **Calculate screening**
  - Expected: returns result + elevated items; saved to history.
- [ ] **History**
  - Expected: submission appears in `/screening-history`.
- [ ] **Download submission PDF**
  - Expected: blob download works.
- [ ] **Send report (PDF upload)**
  - Expected: rejects non-PDF; accepts PDF <=10MB; returns success.

---

## H) Clinician screening reviews
- [ ] **Review list**
  - Expected: clinician sees submissions relevant to their cases.
- [ ] **Record decision**
  - Expected: decision persists; list reflects decision status consistently (status string must match UI expectation).

---

## I) Facial screening
- [ ] **Predict**
  - Expected: accepts jpeg/png/webp <=5MB; returns prediction or friendly error.

---

## J) Lab workflow
- [ ] **Clinician search parents**
  - Expected: search returns parent/children candidates.
- [ ] **Clinician creates test request**
  - Expected: request created; visible to lab.
- [ ] **Lab updates status**
  - Expected: status changes; request list updates.
- [ ] **Lab uploads report**
  - Expected: report stored; clinician can view.
- [ ] **Clinician releases report**
  - Expected: parent sees released report.

---

## K) Messaging
- [ ] **Conversations list**
  - Expected: user sees accessible conversations.
- [ ] **Get or create by case**
  - Expected: returns conversation id.
- [ ] **Send message**
  - Expected: message persists and appears in list.

---

## L) Notifications
- [ ] **List notifications**
  - Expected: notifications return for authenticated user.
- [ ] **Unread count**
  - Expected: count matches unread items.
- [ ] **Mark read / mark all**
  - Expected: unread count drops.
- [ ] **Delete**
  - Expected: item removed.

