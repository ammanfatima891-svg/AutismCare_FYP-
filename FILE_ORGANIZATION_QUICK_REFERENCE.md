FILE_ORGANIZATION_QUICK_REFERENCE.md

# AutismCare Codebase - Quick File Reference

## 📊 Statistics
- **Total Files:** 469
- **Frontend Components:** 90+
- **Backend Controllers:** 24
- **Database Models:** 29
- **API Routes:** 26
- **Services:** 12
- **Integration Tests:** 26
- **E2E Tests (Playwright):** 4
- **Documentation Files:** 8

---

## 🎨 FRONTEND COMPONENT SUMMARY

### By Complexity:
**HIGH** (5 files - Priority refactoring):
- DashboardLayout.tsx (1000+ lines) - Main navigation & auth wrapper
- TherapyPlanBuilder.tsx - Multi-step therapy creation form
- ActivityLibraryScreen.tsx - Complex search/filter interface
- CaseProgressAnalyticsDashboard.tsx - Data visualization dashboard
- ReportDocumentView.tsx - PDF/document rendering

**MEDIUM** (8 files):
- ClinicianDashboard.tsx - Clinician home dashboard
- TherapistCaseFile.tsx - Multi-tab case management
- ParentDashboard.tsx - Parent home & navigation
- ASQ3Form.tsx - Long questionnaire (65+ questions)
- MCHATForm.tsx - Screening form (20 questions)
- CaseMessagingInbox.tsx - Messaging thread list
- SessionForm.tsx - Session logging with validation
- LabRequestsBoard.tsx - Kanban-style request board

**LOW** (77+ files):
- Reusable UI components (buttons, cards, forms)
- Role-specific dashboards (standardized patterns)
- Data display components

### By Role Module:
| Role | Component Count | Folder | Key Components |
|------|---|---|---|
| Parent | 20+ | `src/components/parent/*` | ChildManagement, Screening (7 sub-components), AppointmentRequest |
| Clinician | 12+ | `src/components/clinician/*` | ScreeningReviews, PatientManagement, ReferralForm, ClinicianDashboard |
| Therapist | 18+ | `src/components/therapist/*` | TherapyPlans, CaseFile, Sessions, Progress, 8x case-tabs |
| Lab | 10+ | `src/components/lab/*` | LabDashboard, TestRequests, ReportUpload, RequestsBoard |
| Admin | 5+ | `src/components/admin/*` | UserManagement, ApprovalRequests, StatsCards |
| Shared | 15+ | `src/components/ui/*` + cross-module | Forms, Messaging, Notifications, Auth |

---

## 🔌 BACKEND STRUCTURE

### Controllers (24 files - HTTP Request Handlers)
```
Authentication: auth.controller.js
User Management: parent, clinician, therapist, child, admin
Core Features: appointment, screening, evaluation, referral
Therapy: therapy, therapyPlan, session, schedule, therapyPlanController, therapistDashboardController, therapistCaseController
Lab: lab, labRequest, labTest
Reporting: report, progress, progressEngine, analytics, activity, activityTemplate
Messaging: message, notification
Integration: integration, facialScreening
```

### Models (29 files - Database Schemas)
```
Core Entities:
  - User.js, ChildCase.js, Appointment.js, Questionnaire.js

Screening & Evaluation:
  - ClinicalEvaluation.js, ClinicianNotes.js, Referral.js

Therapy Workflow:
  - TherapyCase.js, TherapyPlan.js, TherapySchedule.js, TherapyEpisode.js
  - SessionLog.js, SessionSlot.js

Activities & Assignments:
  - Activity.js, HomeAssignment.js, Submission.js

Lab Module:
  - LabRequest.js, LabTestRequest.js, LabTest.js, LabReport.js, LabApproval.js, LabTestOrder.js

Collaboration:
  - Message.js, Conversation.js, Notification.js

Analytics & Audit:
  - Report.js, ProgressSnapshot.js, AuditLog.js, AuditEvent.js
```

### Services (12 files - Business Logic)
```
Core: childCase.service.js, caseLifecycleService.js, actionPermissionService.js
Decision: decisionEngine.js (CDSS rule engine)
Therapy: therapyEpisodeService.js
Reporting: reportGenerator.js, reportPdfService.js, progressEngine.js
Workflows: screeningOrchestrator.js, emailService.js
Analytics: caseAnalyticsV2.js, caseAnalyticsSnapshot.js
```

### Routes (26 files - API Endpoints)
```
/api/auth/*              → auth.routes.js
/api/parent/*            → parent.routes.js
/api/child/*             → child.routes.js
/api/case/*              → case.routes.js
/api/appointment/*       → appointment.routes.js
/api/clinician/*         → clinician.routes.js
/api/screening/*         → screening.routes.js
/api/evaluation/*        → evaluationRoutes.js
/api/referral/*          → referralRoutes.js
/api/therapist/*         → therapist.routes.js (+ therapistChildren, therapistCase)
/api/therapy/*           → therapyRoutes.js
/api/therapy-plan/*      → therapyPlanRoutes.js
/api/session/*           → sessionRoutes.js
/api/schedule/*          → scheduleRoutes.js
/api/assignment/*        → homeAssignmentRoutes.js
/api/activity/*          → activityRoutes.js
/api/message/*           → messageRoutes.js
/api/conversation/*      → Integrated in messageRoutes
/api/notification/*      → notification.routes.js
/api/lab/*               → lab.routes.js
/api/lab-request/*       → labRequestRoutes.js
/api/lab-test/*          → labTestRoutes.js
/api/report/*            → reportRoutes.js
/api/progress/*          → progressRoutes.js
/api/progress-engine/*   → progressEngineRoutes.js
/api/analytics/*         → analyticsRoutes.js
/api/admin/*             → admin.routes.js
/api/facial-screening/*  → facialScreening.routes.js
/api/integration/*       → integrationRoutes.js
```

---

## 🧪 TESTING STRUCTURE

### Unit Tests (7 files - `src/__tests__/`)
- App.test.tsx - Routing & component rendering
- AuthContext.test.tsx - Authentication state
- AuthForm.flow.test.tsx - Login flow validation
- ClinicalEvaluationTab.test.tsx - Evaluation form
- DashboardLayout.test.tsx - Navigation & layout
- ProtectedRoute.test.tsx - Route guards
- ScreeningReviews.test.tsx - Screening review UI

### E2E Tests (4 files - `tests/e2e/`)
- auth-workflows.spec.js - Login, signup, logout
- home-assignments-loop.spec.js - Assignment creation & completion
- lab-release-flow.spec.js - Lab test request to report upload
- screening-flow.spec.js - Screening completion workflow

### Integration Tests (26+ files - `server/tests/integration/`)
**Core Workflows:**
- workflow.integration.test.js - Main workflows
- auth.integration.test.js - Auth system

**Screening (4 tests):**
- screening.integration.test.js - Basic flow
- screening-advanced.integration.test.js - Complex scenarios
- screening-asq-edge.integration.test.js - ASQ-3 edge cases
- screening-clinician-decision.integration.test.js - CDSS integration

**Therapy Planning (5 tests):**
- therapy-chain.integration.test.js - Referral to therapy
- therapy-plan-approval.integration.test.js - Approval workflow
- therapy-plan-advanced.integration.test.js - Complex scenarios
- therapy-plan-edge-deep.integration.test.js - Edge cases
- therapy-plan-stress-race.integration.test.js - Concurrency/race

**Scheduling (2 tests):**
- schedule-advanced.integration.test.js - Complex scheduling
- schedule-slot-transition-matrix.integration.test.js - Slot states

**Evaluation (2 tests):**
- evaluation.integration.test.js - Basic evaluation
- evaluation-advanced.integration.test.js - Complex scenarios

**Other Modules (10+ tests):**
- home-assignment-edge.integration.test.js
- messaging-advanced.integration.test.js
- notifications-advanced.integration.test.js
- lab-advanced.integration.test.js
- reports-advanced.integration.test.js
- progress-analytics.integration.test.js
- admin-security.integration.test.js
- security-authz.integration.test.js
- security-fuzz.integration.test.js
- activity-library-advanced.integration.test.js
- appointments-exceptional-bva.integration.test.js
- referrals-exceptional-bva.integration.test.js
- exceptional-bva.integration.test.js
- role-module-smoke.test.js
- modules-messaging-notifications-lab-admin-activity.integration.test.js

---

## 🤖 ML SERVICE STRUCTURE

**Location:** `server/ml/facial_screening_service/`

**Files:**
- app.py - FastAPI server entry point
- requirements.txt - Python dependencies (TensorFlow, OpenCV, etc.)
- labeling.py - Face detection & label mapping
- test_label_mapping.py - ML tests

**Configuration:**
- Separate Python service on port 8001
- Requires Python 3.11/3.12 (3.13 has TensorFlow issues)
- Returns signals: `face_detected`, `quality_warning`
- Optional OpenCV face-focused cropping

---

## 📚 DOCUMENTATION (8 files)

```
README.md                               # Project overview & getting started
SYSTEM_ARCHITECTURE.md                  # Architecture diagram & flow
SYSTEM_QA_CHECKLIST.md                  # QA testing checklist
TEST_FEATURE_STATUS.md                  # Test coverage status
THERAPY_MODULE_DOCUMENTATION.md         # Therapy-specific features
UNIFIED_SYSTEM_DOCUMENTATION.md         # Comprehensive system guide
OTHER_MODULES_DOCUMENTATION.md          # Non-therapy modules
CODEBASE_ANALYSIS_FOR_FIGMAAI.md        # This analysis (NEW)
```

---

## 🎨 DESIGN SYSTEM

### Current Palette (Calm Redesign - In Progress)
- **Primary Blue:** #4B7EC4 (light: #E8F0FA)
- **Secondary Green:** #6ABD8A (light: #E8F4F0)
- **Accent Lavender:** #A99BCC (light: #F5F3FA)
- **Status Colors:** Green/Amber/Red shades

### Styling Framework
- **CSS Framework:** Tailwind CSS
- **Component Library:** shadcn/ui (50+ pre-built components)
- **Icons:** Likely Lucide React (common with shadcn)
- **Theme Toggle:** Dark/light mode via ThemeToggleButton.tsx

### Responsive Strategy
- Mobile-first design
- Breakpoints: sm, md, lg, xl
- Navigation: Mobile drawer + desktop sidebar
- Tables: Horizontal scroll on mobile

---

## 🔗 KEY WORKFLOWS FOR UI

### 1. PARENT SCREENING WORKFLOW
```
Parent Registers → Add Child → Select Screening Tool
  → ASQ-3 or M-CHAT-R (Guided Flow)
  → Submit & Get Score
  → View Recommendation (CDSS Generated)
  → Optional: Book Appointment
```

### 2. CLINICAL REFERRAL WORKFLOW
```
Clinician Reviews Screening → Add Evaluation + Notes
  → Create Referral → Send to Therapist
  → Therapist Creates Therapy Plan
  → Assign Sessions & Home Activities
  → Parent Views Activities
```

### 3. SESSION LOGGING & PROGRESS
```
Therapist → Select Case → Log Session
  → Record Goals & Notes
  → Assign Activities
  → System Auto-Updates Progress Metrics
  → Generate Progress Reports
```

### 4. LAB INTEGRATION
```
Clinician Requests Test → Lab Receives Request
  → Lab Uploads Report → Clinician Reviews
  → Approve/Reject → Parent Sees Results
```

---

## 🚀 DEVELOPMENT COMMANDS

**Development:**
```bash
npm run dev              # Vite client (:4173) + Express (:4000)
cd client && npm test    # Run Vitest
npm run test:e2e        # Run Playwright
```

**Build:**
```bash
npm run build            # Vite production build
```

**Deployment:**
- **Client:** Vercel (vercel.json configured)
- **Server:** Render.yaml configured
- **ML Service:** Separate Python process

---

## 📋 REFACTORING PRIORITY CHECKLIST

### Phase 1: Design Tokens
- [ ] Color palette in Tailwind config
- [ ] Typography scale
- [ ] Spacing/sizing system
- [ ] Shadow/elevation levels

### Phase 2: Component Audit
- [ ] Review shadcn/ui consistency
- [ ] Consolidate duplicate components
- [ ] Create variant system (primary/secondary/danger)
- [ ] Add missing components

### Phase 3: Dashboard Redesigns
- [ ] Parent dashboard (home, screening, appointments)
- [ ] Clinician dashboard (cases, evaluations, referrals)
- [ ] Therapist dashboard (plans, sessions, progress)
- [ ] Lab dashboard (requests, uploads)
- [ ] Admin dashboard (users, moderation)

### Phase 4: Feature-Specific UX
- [ ] Screening: Improve guided flow, results visualization
- [ ] Therapy: Multi-step clarity, template selection
- [ ] Session: Form ergonomics, quick entry
- [ ] Progress: Data visualization (charts, metrics)
- [ ] Messaging: Chat styling, timestamps
- [ ] Lab: Status timeline, report previews

### Phase 5: Accessibility & Polish
- [ ] WCAG 2.1 AA compliance
- [ ] Mobile responsiveness
- [ ] Empty states & loading
- [ ] Dark mode (if needed)

---

## 🎯 IMPORT INTO FIGMAAI

Use the main `CODEBASE_ANALYSIS_FOR_FIGMAAI.md` file directly in your FigmaAI design prompt:

1. Copy the full analysis file content
2. Paste into FigmaAI's input
3. Request design system tokens, component library audit, and page redesigns
4. Use the workflow diagrams for UX improvements
5. Reference the component complexity matrix for prioritization

---

**Analysis Generated:** April 26, 2026  
**For:** AutismCare Platform UI Refactoring  
**All 469 Files Catalogued ✓**
