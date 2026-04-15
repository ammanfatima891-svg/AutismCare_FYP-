# ASD Management System - Feature Test Status

Updated: 2026-04-11

## 1) Features Tested (With Expected Response and Result)

| Feature Area | What Was Tested | Expected Response | Result |
|---|---|---|---|
| Auth | Register parent user | 201 created (registration accepted) | Passed |
| Auth | Login blocked before email verification | 401/blocked auth | Passed |
| Auth | Login allowed after verification | 200 + token | Passed |
| Auth | Invalid verify token path | 4xx invalid token response | Passed |
| Role Access | Parent access to parent child module | 200 or valid module response | Passed |
| Role Access | Parent blocked from clinician module | 403 forbidden | Passed |
| Role Access | Unauthenticated child endpoint | 401 unauthorized | Passed |
| Parent Child | Create child with valid minimum payload | 201/200 success + child record | Passed |
| Parent Child | Missing required fields | 400 validation error | Passed |
| Parent Child | Invalid gender enum | 400 validation error | Passed |
| Parent Child | Update/delete unknown child | 404 not found | Passed |
| Cross-Role Case Workflow | Clinician creates case for parent child | 201/200 case created | Passed |
| Cross-Role Case Workflow | Clinician fetches created case | 200 + case list | Passed |
| Cross-Role Case Workflow | Parent blocked from clinician case API | 403 forbidden | Passed |
| Appointments | Parent create appointment with required data | 201 created | Passed |
| Appointments | Missing required fields | 400 validation error | Passed |
| Appointments | Invalid child id | 400 invalid id | Passed |
| Appointments | Type/role mismatch | 400 invalid professional for type | Passed |
| Appointments | Past preferred date | 400 validation error | Passed |
| Appointments | Double booking same slot/professional | 409 conflict | Passed |
| Appointments | Non-owner professional approval | 403 forbidden | Passed |
| Appointments | Owner professional approval | 200 approved | Passed |
| Appointments | Parent cancel once after approval | 200 cancelled | Passed |
| Appointments | Cancel already-cancelled appointment | 400 invalid transition | Passed |
| Referrals | Clinician create referral with valid data | 201 created | Passed |
| Referrals | Missing fields / invalid case id | 400 validation error | Passed |
| Referrals | Invalid therapistType / priority enums | 400 validation error | Passed |
| Referrals | Duplicate active referral for same case/type | 409 conflict | Passed |
| Referrals | Therapist accept pending matching referral | 200 accepted | Passed |
| Referrals | Accept already accepted | 400 invalid transition | Passed |
| Referrals | Start accepted referral | 200 in-progress + therapyCase | Passed |
| Referrals | Start pending referral | 400 invalid transition | Passed |
| Referrals | Therapist non-matching specialization accept | 403 forbidden | Passed |
| Referrals | Route guards (therapist create, clinician accept/start) | 403 forbidden | Passed |
| Therapy Chain | Therapist creates final therapy plan | 201 created | Passed |
| Therapy Chain | Therapist logs session against plan goal/activity | 201 created | Passed |
| Therapy Chain | Parent gets case sessions with parentInstructions | 200 + session list | Passed |
| Therapy Chain | Therapist creates home assignment | 201 created | Passed |
| Therapy Chain | Parent gets case assignments | 200 + assignment list | Passed |
| Therapy Chain | Parent submits assignment evidence | 200 submitted | Passed |
| Therapy Chain | Therapist reviews assignment | 200 reviewed | Passed |
| Therapy Chain | Parent marks reviewed assignment complete | 200 completed | Passed |
| Messaging (Parent-Therapist) | Parent opens/creates conversation | 200 + conversation | Passed |
| Messaging (Parent-Therapist) | Parent sends message | 201 created | Passed |
| Messaging (Parent-Therapist) | Therapist reads messages/conversations | 200 + data | Passed |
| Messaging (Parent-Therapist) | Non-participant clinician access attempt | 403 forbidden | Passed |
| Notifications | Unread count endpoint | 200 + count | Passed |
| Notifications | Mark one notification read | 200 success | Passed |
| Notifications | Mark all notifications read | 200 success | Passed |
| Notifications | Delete notification | 200 success | Passed |
| Lab Workflow | Parent blocked from clinician-only request route | 403 forbidden | Passed |
| Lab Workflow | Clinician creates lab request | 201 created | Passed |
| Lab Workflow | Lab updates request status to UPLOADED | 200 updated | Passed |
| Lab Workflow | Clinician releases to parent | 200 released | Passed |
| Lab Workflow | Parent accesses released reports | 200 + released records | Passed |
| Admin Workflow | List pending professionals | 200 + pending users | Passed |
| Admin Workflow | Invalid moderation status | 400 validation error | Passed |
| Admin Workflow | Approve pending professional | 200 updated | Passed |
| Admin Workflow | Approved user removed from pending list | Not present in list | Passed |
| Activity Library | Parent forbidden from therapist templates | 403 forbidden | Passed |
| Activity Library | Therapist creates template | 201 created | Passed |
| Activity Library | Therapist lists templates | 200 + template list | Passed |
| Activity Library | Therapist clones template | 201 created | Passed |
| Activity Library | Therapist assigns activity to home | 201 created | Passed |
| Frontend Unit/Component | Route rendering, protected routes, auth context, dashboard layout | Components render and role logic works | Passed |
| Screening Workflow | Questionnaire lookup, availability, scoring, history, status, download | Core screening flow works | Passed |
| Clinical Evaluation Lifecycle | Create, list, fetch, version, parent-blocked access | Core evaluation flow works | Passed |
| Therapy Plan Advanced Lifecycle | Duplicate, assign, finalization rules, parent-blocked access | Advanced therapy plan flow works | Passed |
| Sessions/Schedules Advanced | Schedule creation, slot generation, slot status transitions, role guards | Advanced schedule flow works | Passed |
| Home Assignment Edge Matrix | Upload validation (type/size), submission path safety checks, and assignment state-machine invalid transition matrix | Edge cases enforced across upload and lifecycle transitions | Passed |
| Progress Analytics | Overview/domain/session analytics with fixture-validated trend aggregation, domain alias normalization, unsupported-domain guard, and cross-clinician ownership isolation | Analytics math matches known fixtures and access constraints | Passed |
| Reports Advanced | Generation variants, payload/content validation, duplicate suppression, filter validation, and role/case-based list/view constraints | Advanced reporting flow works with content and access safeguards | Passed |
| Messaging Advanced | Long-message + high-volume flows, malformed IDs, empty-message rejection, optional pagination behaviors, and cross-case isolation | Advanced messaging flow works | Passed |
| Notifications Advanced | Trigger-by-event coverage (including clinician follow-up due generation), unread-only filtering, pagination, idempotent follow-up dedupe, ownership-safe read/delete flows, and cross-user isolation | Advanced notification flow works | Passed |
| Admin Security/Authorization | Unauthenticated blocked, broad non-admin role matrix blocked (parent/therapist/lab), malformed moderation payload validation, and abuse-throttling on moderation endpoint while preserving valid admin moderation flow | Route protection and moderation hardening enforced | Passed |
| Lab Advanced Lifecycle | Real multipart upload endpoint path, report metadata validation (file type/name/size + linkage), invalid release/status transition guards, clinician/lab/parent cross-access matrix, and parent visibility gating pre/post release | Advanced lab flow works | Passed |
| Activity Library Advanced | Platform template edit restrictions, update-name conflict handling, ownership matrix, plan/home assignment conflict paths, invalid due-date guard, and filter/search edge cases | Advanced activity flow works | Passed |
| Performance / Load / Resilience | Burst throughput on protected notification endpoints, concurrent report generation under duplicate suppression semantics, latency smoke bounds, and failure recovery after malformed requests | Performance/resilience smoke behavior validated for high-value API paths | Passed |
| Screening Advanced | Invalid questionnaire/response validation, parent-child ownership guard, clinician review risk-status mapping | Advanced screening validation and review mapping works | Passed |
| Clinical Evaluation Advanced | Invalid IDs/statuses, empty payload rejection, clinician ownership guards for list/fetch/version | Advanced evaluation validation and authorization flow works | Passed |
| Security AuthZ Hardening | Missing/malformed token rejection and forged-role access denial on admin routes | Core authz bypass probes blocked | Passed |
| Screening ASQ Edge Matrix | Unsupported interval rejection, ASQ cutoff boundary outcomes (Fail/Monitor/Pass), clinician needs-attention mapping | ASQ boundary scoring behavior validated | Passed |
| Therapy Plan Deep Edge Matrix | Inactive case create denial, assign mismatch/conflict paths, duplicate child mismatch, finalization validation, cross-therapist ownership check | Deep lifecycle and ownership edge paths validated | Passed |
| Security Fuzz Matrix | Injection-style login probes, expired/malformed-token bursts across broader protected endpoint corpus, invalid-id resilience checks, and explicit no-refresh-token-rotation surface probes | Security fuzz probes blocked without auth bypass and unsupported token-rotation surface validated | Passed |
| Screening Clinician Decision Workflow | Clinician decision endpoint validation, persisted decision actions, review-list status transition after decision | Clinician screening decision actions validated | Passed |
| Screening Frontend Decision + Notification Hook | ScreeningReviews clinician decision actions (clear/monitor/refer), decision-note submission, and dashboard notification bell refresh signal wiring | Frontend review actions and notification propagation hook integration validated | Passed |
| Clinical Evaluation Frontend Interaction Matrix | ClinicalEvaluationTab create-draft flow, finalize-gated referral action, edit-as-new-version behavior | Frontend lifecycle interactions and transition gating behave as expected | Passed |
| Therapy Plan Stress/Race/Long-Horizon Matrix | Multi-domain high-volume final plan payloads, concurrent PATCH race handling, and iterative long-horizon revision cycles | Advanced therapy plan stress, race resilience, and long-horizon lifecycle behavior validated | Passed |
| Sessions/Schedules Transition Matrix | Multi-week schedule generation, slot status transitions (completed/missed/rescheduled), malformed/invalid transition handling, and therapist/parent/clinician/non-owner access matrix | Advanced schedule slot lifecycle and role-guard behavior validated | Passed |
| Browser E2E | Auth + parent-child + clinician case + appointment approval + referral accept/start + therapist landing | End-to-end user paths complete | Passed |

## 2) Not Fully Tested Yet (Gaps)

| Feature Area | Current State | Gap to Cover |
|---|---|---|
| None | N/A | All currently tracked functional/security/resilience gaps have targeted coverage |

## 3) Worth Fixing (High Value)

1. None currently outstanding in this section.
   - Prior high-value cleanup items were implemented:
   - SessionSlot duplicate index warning removed.
   - Auth registration debug logs are now env-gated.
   - Notification malformed ObjectId handling now returns clean 400 without CastError noise.
   - Unit/e2e separation is enforced in Vitest exclude patterns.

## 4) Evidence (Main Test Files)

- server/tests/integration/auth.integration.test.js
- server/tests/integration/role-module-smoke.test.js
- server/tests/integration/workflow.integration.test.js
- server/tests/integration/exceptional-bva.integration.test.js
- server/tests/integration/appointments-exceptional-bva.integration.test.js
- server/tests/integration/referrals-exceptional-bva.integration.test.js
- server/tests/integration/therapy-chain.integration.test.js
- server/tests/integration/modules-messaging-notifications-lab-admin-activity.integration.test.js
- server/tests/integration/reports-advanced.integration.test.js
- server/tests/integration/messaging-advanced.integration.test.js
- server/tests/integration/notifications-advanced.integration.test.js
- server/tests/integration/admin-security.integration.test.js
- server/tests/integration/lab-advanced.integration.test.js
- server/tests/integration/activity-library-advanced.integration.test.js
- server/tests/integration/screening-advanced.integration.test.js
- server/tests/integration/screening-asq-edge.integration.test.js
- server/tests/integration/evaluation-advanced.integration.test.js
- server/tests/integration/therapy-plan-edge-deep.integration.test.js
- server/tests/integration/therapy-plan-stress-race.integration.test.js
- server/tests/integration/schedule-slot-transition-matrix.integration.test.js
- server/tests/integration/performance-resilience.integration.test.js
- server/tests/integration/security-authz.integration.test.js
- server/tests/integration/security-fuzz.integration.test.js
- server/tests/integration/screening-clinician-decision.integration.test.js
- client/src/__tests__/App.test.tsx
- client/src/__tests__/AuthContext.test.tsx
- client/src/__tests__/ProtectedRoute.test.tsx
- client/src/__tests__/DashboardLayout.test.tsx
- client/src/__tests__/ClinicalEvaluationTab.test.tsx
- client/src/__tests__/ScreeningReviews.test.tsx
- client/tests/e2e/auth-workflows.spec.js
