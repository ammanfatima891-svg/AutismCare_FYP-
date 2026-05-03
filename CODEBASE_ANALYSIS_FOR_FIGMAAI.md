# AutismCare Platform - Complete Codebase Analysis for UI Refactoring
**Project:** ASD Management System  
**Stack:** React 19 (TypeScript/JSX) + Node.js/Express + MongoDB  
**Purpose:** Digital autism screening, clinical management, therapy planning, and progress monitoring  
**Date:** April 2026  

---

## 📋 Executive Summary

AutismCare is a **role-based healthcare platform** with 5 user types (Parent, Clinician, Therapist, Lab Technician, Admin) managing autism screening, referrals, therapy plans, and reporting. The UI consists of **31+ major feature areas** with **400+ total files** across 5 roles. Current design uses **Tailwind CSS + shadcn/ui** component library.

**Total File Count:** 469 files
**UI Components:** ~90+ reusable React components
**Pages:** ~25+ major dashboard/page views
**Design Tokens:** Soft blue/green/lavender palette (calm redesign in progress)

---

## 🏢 Role-Based Architecture Overview

### The 5 Primary Roles & Their Core Responsibilities:

```
PARENT/CAREGIVER
├── Register child
├── Complete ASQ-3/M-CHAT-R screenings
├── View screening results & recommendations
├── Book appointments
├── View therapy assignments
├── Access educational resources
└── Receive notifications

CLINICIAN
├── Review screening results
├── Add clinical notes & evaluations
├── Make referral recommendations
├── Approve therapy plans
├── Monitor lab integrations
└── Generate clinical reports

THERAPIST
├── Create therapy plans from referrals
├── Schedule & log therapy sessions
├── Assign home activities
├── Monitor child progress
├── Track assignments & completion
└── Generate progress reports

LAB TECHNICIAN
├── Receive lab test requests
├── Upload test results/reports
├── Manage lab test inventory
├── Coordinate with clinicians
└── Track specimen status

ADMIN
├── Manage user accounts
├── Moderate content
├── View system analytics
├── Manage approval workflows
└── Oversee audit logs
```

---

## 📁 COMPLETE FILE STRUCTURE & ORGANIZATION

### 🎨 **SECTION 1: FRONTEND CLIENT (client/)**

#### **1.1 Root Configuration Files** (11 files)
```
client/package.json                 # NPM dependencies, version mgmt
client/package-lock.json            # Locked dependency versions
client/index.html                   # Main HTML entry point
client/vite.config.mjs              # Vite build configuration
client/vitest.config.ts             # Vitest unit test configuration
client/playwright.config.cjs         # Playwright e2e test config
client/eslint.config.js             # ESLint rules for code quality
client/tailwind.config.cjs           # Tailwind CSS theme/colors
client/README.md                    # Client-specific documentation
client/vercel.json                  # Vercel deployment config
client/tsconfig.json                # TypeScript configuration
```

#### **1.2 Core Application** (6 files)
```
src/main.tsx                        # React DOM root/entry
src/App.tsx                         # Main app routing & layout
src/App.css                         # Global app styles
src/index.css                       # Global CSS resets & base styles
src/api.js                          # Axios API client setup
```

#### **1.3 Context & State Management** (1 file)
```
src/context/AuthContext.jsx         # JWT auth, user role, login state
```

#### **1.4 Constants** (2 files)
```
src/constants/Roles.tsx             # User role enum/constants
src/constants/screeningRecommendations.ts  # ASQ-3/M-CHAT-R thresholds
```

#### **1.5 Utilities** (7 files)
```
src/utils/ageUtils.js               # Calculate child age from DOB
src/utils/blobApiError.ts           # Error handling for blob responses
src/utils/caseMessageNotificationNav.ts  # Case-message notification logic
src/utils/jwtSubject.ts             # JWT payload subject parsing
src/utils/therapyPlanResponse.ts    # Therapy plan status handlers
src/utils/workflowStatus.ts         # Normalize workflow status values
src/utils/runtimeConfig.ts          # Public API endpoint config
```

#### **1.6 Services** (2 files)
```
src/services/api.js                 # HTTP client helper methods
src/services/sessionService.ts      # Session log API integration
```

#### **1.7 Test Configuration** (1 file)
```
src/test/setup.ts                   # Vitest setup & globals
```

#### **1.8 Public Assets** (3 files)
```
public/icons/icon-192x192.png       # Mobile app icon small
public/icons/icon-512x512.png       # Mobile app icon large
public/vite.svg                     # Vite logo asset
```

---

### 🧩 **SECTION 2: UI COMPONENT LIBRARY** (~90 components)

#### **2.1 Shadcn/UI Base Components** (50+ files)
Located in `src/components/ui/` - These are pre-built, unstyled, accessible Radix UI components wrapped with Tailwind:

**Form & Input Components:**
```
button.tsx                  # Primary, secondary, danger, outline variants
input.tsx                   # Text, email, password, number inputs
textarea.tsx                # Multi-line text input
select.tsx                  # Dropdown with search capability
checkbox.tsx                # Single & group checkboxes
radio-group.tsx             # Radio button group
toggle.tsx                  # Toggle switch (binary state)
toggle-group.tsx            # Multi-option toggle group
input-otp.tsx               # OTP/2FA input mask
slider.tsx                  # Range slider (numeric input)
```

**Feedback & Indicators:**
```
badge.tsx                   # Small status/category labels
alert.tsx                   # Warning/error/info/success messages
alert-dialog.tsx            # Confirmation dialogs
skeleton.tsx                # Loading placeholder shimmer
progress.tsx                # Progress bar/percentage indicator
chart.tsx                   # Recharts wrapper for data visualization
```

**Layout & Navigation:**
```
card.tsx                    # Container with header/footer
tabs.tsx                    # Multi-tab navigation panel
accordion.tsx               # Collapsible sections
sidebar.tsx                 # Collapsible navigation drawer
breadcrumb.tsx              # Navigation breadcrumb trail
pagination.tsx              # Multi-page navigation
navigation-menu.tsx         # Top navigation bar
menubar.tsx                 # Desktop menu bar
dropdown-menu.tsx           # Context/action menu
context-menu.tsx            # Right-click context menu
```

**Dialog & Overlay:**
```
dialog.tsx                  # Modal dialog/popup
drawer.tsx                  # Side drawer panel
popover.tsx                 # Floating tooltip/popover
hover-card.tsx              # Hover-triggered card
sheet.tsx                   # Overlay sheet (mobile-friendly)
```

**Data Display:**
```
table.tsx                   # Data table with sorting/filtering
carousel.tsx                # Image/content carousel slider
scroll-area.tsx             # Custom scrollable area
resizable.tsx               # Resizable panels/containers
```

**Text & Labels:**
```
label.tsx                   # Form field labels
form.tsx                    # React Hook Form integration wrapper
```

**Other UI:**
```
avatar.tsx                  # User profile pictures
aspect-ratio.tsx            # Maintains aspect ratio containers
tooltip.tsx                 # Hover tooltip text
separator.tsx               # Visual divider line
command.tsx                 # Command palette/search
collapsible.tsx             # Expandable/collapsible section
ThemeToggleButton.tsx       # Dark/light mode switcher
sonner.tsx                  # Toast notification system
use-mobile.ts               # Mobile detection hook
utils.ts                    # Shared component utilities
```

#### **2.2 Custom Feature Components** (35+ files)

**Parent Module Components:**
```
src/components/parent/
├── DashboardHome.tsx                    # Parent home/overview dashboard
├── ChildManagement.tsx                  # Add/edit/view children list
├── AppointmentRequestForm.tsx           # Book appointment UI
├── AppointmentStatusPage.tsx            # View appointment status
├── AppointmentsSection.tsx              # Appointments widget
├── EducationSection.tsx                 # Autism education resources
├── ParentDashboard.tsx                  # Main parent layout
├── ParentChildCasePage.tsx              # Child case detail view
├── ParentCaseEntry.tsx                  # Initial case entry form
├── ParentCaseIntegrationPanels.tsx      # Multi-tab case overview
├── ParentHomeAssignments.tsx            # Therapy assignment list
├── ParentLabReports.tsx                 # Lab results viewer
├── ParentMessages.tsx                   # Parent-clinician messaging
├── ParentScreenings.tsx                 # Screening history/overview
├── ParentTherapySessionInstructions.tsx # Session guidance
├── CommunicationSection.tsx             # Contact/FAQ section
├── DashboardHome.tsx                    # Parent home landing
├── AppointmentRequestForm.tsx           # Appointment booking form
│
├── child/
│   ├── AddChildForm.tsx                 # Add new child profile
│   ├── ChildList.tsx                    # List of registered children
│   └── ChildProfile.tsx                 # Individual child details
│
├── screening/
│   ├── ASQ3Form.tsx                     # ASQ-3 questionnaire form
│   ├── MCHATForm.tsx                    # M-CHAT-R questionnaire form
│   ├── ScreeningIntro.tsx               # Screening introduction screen
│   ├── ScreeningSection.tsx             # Screening overview/launcher
│   ├── ScreeningResults.tsx             # Score & recommendation display
│   ├── QuestionnaireSelection.tsx       # Choose which screening
│   ├── BehavioralAnimations.tsx         # Behavioral guidance videos
│   ├── FacialScreening.tsx              # ML-based facial analysis
│   ├── FacialScreeningSection.tsx       # Facial screening container
│   ├── FacialScreeningResults.tsx       # Facial screening results
│   │
│   └── guided/                          # Guided screening flow
│       ├── QuestionCard.tsx             # Single question card UI
│       ├── ProgressHeader.tsx           # Progress indicator header
│       ├── GuideToggle.tsx              # Show/hide guidance
│       ├── GuidanceCards.tsx            # Help text for questions
│       ├── ReadMoreSection.tsx          # Expandable info section
│       ├── ResumeProgressDialog.tsx     # Resume incomplete screening
│       └── useScreeningProgress.ts      # Progress tracking hook
│
├── education/
│   ├── WhatIsAutism.tsx                 # Autism education content
│   └── UnderstandingResults.tsx         # Results interpretation guide
│
└── parentNavigation.ts                  # Parent route configuration
```

**Clinician Module Components:**
```
src/components/clinician/
├── ClinicianDashboard.tsx               # Main clinician layout
├── ClinicianHome.tsx                    # Clinician home dashboard
├── PatientManagement.tsx                # View assigned cases
├── ScreeningReviews.tsx                 # Review parent screenings
├── ReferralRecommendationForm.tsx       # Create referral recommendation
├── ClinicalNotesForm.tsx                # Add clinical notes
├── AppointmentsManagement.tsx           # Manage appointments
├── AppointmentRequestsList.tsx          # Pending appointment requests
├── AppointmentDecisionUI.tsx            # Approve/reject appointments
├── ClinicianMessages.tsx                # Case messaging
├── ClinicianLabReports.tsx              # View lab test results
└── ClinicianNotificationsPage.tsx       # Notification center
```

**Therapist Module Components:**
```
src/components/therapist/
├── TherapistDashboard.tsx               # Main therapist layout
├── TherapistHome.tsx                    # Therapist home dashboard
├── TherapistClients.tsx                 # Client list
├── TherapistClientsList.tsx             # Alternative client list view
├── TherapistCaseFile.tsx                # Case file viewer
├── TherapistAssignedCases.tsx           # My assigned cases
├── ChildProfile.tsx                     # Assigned child profile
├── TherapyPlans.tsx                     # Therapy plan list/manager
├── TherapyRecommendationForm.tsx        # Create therapy from referral
├── TherapyPlanTemplate.tsx              # Therapy plan preview
├── TherapistSessions.tsx                # Therapy session list
├── TherapistProgress.tsx                # Client progress view
├── TherapistNotificationsPage.tsx       # Notification center
├── TherapistMessages.tsx                # Case messaging
├── TherapistAppointments.tsx            # Appointment schedule
├── TherapistCommunicationTopBar.tsx     # Top nav bar
├── AssignActivityForm.tsx               # Assign home activity form
│
├── case-tabs/
│   ├── caseFileTypes.ts                 # TypeScript types for case
│   ├── OverviewTab.tsx                  # Case overview summary
│   ├── SessionsCaseTab.tsx              # Sessions for case
│   ├── TherapyPlansCaseTab.tsx          # Therapy plans for case
│   ├── ReportsCaseTab.tsx               # Reports for case
│   ├── ProgressCaseTab.tsx              # Progress metrics for case
│   ├── HomeAssignmentsCaseTab.tsx       # Activities for case
│   └── AssignedActivityCaseTab.tsx      # Activity assignments
```

**Lab Module Components:**
```
src/components/lab/
├── LabDashboard.tsx                     # Main lab layout
├── LabHome.tsx                          # Lab home dashboard
├── LabMyTests.tsx                       # Tests assigned to lab
├── LabTestRequests.tsx                  # Incoming requests
├── LabTestRequestsList.tsx              # Request list variant
├── LabTestRequestDetail.tsx             # Request details/fulfillment
├── LabRequestsBoard.tsx                 # Kanban board view
├── LabReports.tsx                       # Lab reports list
├── LabReportUpload.tsx                  # Upload report UI
├── TestOrderManagement.tsx              # Manage test orders
├── LabNotifications.tsx                 # Lab notifications
└── labStatus.ts                         # Lab status badges (design tokens)
```

**Admin Module Components:**
```
src/components/admin/
├── UserManagementTable.tsx              # Admin user CRUD
├── ApprovalRequests.tsx                 # Pending approvals
├── AdminAppointments.tsx                # All appointments admin
├── ContentManagementForm.tsx            # Content/templates mgmt
├── StatsCards.tsx                       # Admin metrics/KPIs
```

**Evaluation Module:**
```
src/components/evaluation/
├── EvaluationForm.tsx                   # Create/edit evaluation
├── ClinicalEvaluationTab.tsx            # Evaluation tab in case
```

**Referral Module:**
```
src/components/referral/
├── ReferralTab.tsx                      # Referral section in case
```

**Case/Child Management:**
```
src/components/case/
├── ChildCaseList.tsx                    # View all cases
├── ChildCaseDetail.tsx                  # Individual case detail
├── ChildCaseLabModule.tsx               # Lab integration tab
├── CaseLabRequestsPanel.tsx             # Lab requests for case
```

**Therapy Plan Module:**
```
src/components/therapy-plan/
└── TherapyPlanBuilder.tsx               # Create/edit therapy plan
```

**Activity & Assignment:**
```
src/components/activity/
└── index.ts                             # Activity exports

src/components/activity-library/
├── ActivityLibraryScreen.tsx            # Browse activity templates
├── ActivityTemplateFormDialog.tsx       # Create activity template
└── activityTypes.ts                     # Activity data types
```

**Session Management:**
```
src/components/session/
├── SessionForm.tsx                      # Log session form
├── SessionList.tsx                      # Session history
└── sessionFormat.ts                     # Session display formatting
```

**Progress & Analytics:**
```
src/components/progress/
└── ProgressMonitoringTab.tsx            # Progress visualization

src/components/analytics/
├── types.ts                             # Analytics type definitions
├── CaseProgressAnalyticsDashboard.tsx   # Detailed analytics
└── TherapistProgressHub.tsx             # Therapist analytics overview
```

**Reports Module:**
```
src/components/reports/
├── ReportCard.tsx                       # Report preview card
├── ReportDocumentView.tsx               # Report full view
├── ReportFilters.tsx                    # Report filtering UI
├── ReportViewerDialog.tsx               # Modal report viewer
├── GenerateReportModal.tsx              # Generate new report
├── ClinicianCaseReports.tsx             # Clinician report view
├── ParentTherapyReports.tsx             # Parent report view
├── reportLabels.ts                      # Report type labels/enum
└── index.ts                             # Reports exports

src/components/report-card/
├── ReportTypeCard.tsx                   # Report type selector
└── RecentReportItem.tsx                 # Recent report in list
```

**Messaging:**
```
src/components/messaging/
├── CaseMessagingInbox.tsx               # Inbox view
└── CaseMessagingThread.tsx              # Message thread detail
```

**Notifications:**
```
src/components/notifications/
├── NotificationBell.tsx                 # Bell icon with unread count
└── ClinicianNotificationsPage.tsx       # Notification detail page
```

**Scheduling:**
```
src/components/schedule/
└── ScheduleCaseTab.tsx                  # Schedule view for case
```

**Results Display:**
```
src/components/results/
└── DecisionSummaryCard.jsx              # CDSS decision display
```

**Figma Integration:**
```
src/components/figma/
└── ImageWithFallback.tsx                # Figma image with fallback
```

**Layout:**
```
src/components/layout/
├── DashboardLayout.tsx                  # Main dashboard wrapper
├── DashboardLayout.tsx.backup           # Backup version
└── TODO.md                              # Layout tasks
```

**Top-Level Components:**
```
src/components/
├── AddChildForm.tsx                     # Reusable add child form
├── AuthForm.tsx                         # Login/signup form
├── CaseStatusBadge.jsx                  # Status display badge
├── EmailVerification.tsx                # Email verification screen
├── ProtectedRoute.jsx                   # Auth guard wrapper
└── ScreeningForm.jsx                    # Reusable screening form
```

**Therapy Overview:**
```
src/components/therapy/
└── TherapyOversightTab.tsx              # Therapy overview tab
```

---

### 📄 **SECTION 3: PAGE COMPONENTS** (25+ files)
Located in `src/pages/` - Full-page views with route context:

```
src/pages/
├── AdminDashboard.jsx                   # Admin dashboard page
├── ForgotPassword.jsx                   # Password reset request
├── Onboarding.jsx                       # Initial user setup
├── ResetPassword.jsx                    # Password reset form
├── VerifyEmail.jsx                      # Email verification page
│
├── parent/
│   └── ScreeningGuide.jsx               # Parent screening guide page
│
├── referrals/
│   ├── ReferralPage.tsx                 # Create referral page
│   └── AssignedReferralsPage.tsx        # View assigned referrals
│
├── evaluations/
│   ├── ClinicalEvaluationPage.tsx       # Create clinical evaluation
│   └── EvaluationListPage.tsx           # View evaluations
│
├── sessions/
│   ├── LogTherapySessionPage.tsx        # Log session page
│   └── TherapistSessionsListPage.tsx    # Session history page
│
├── home-assignments/
│   └── TherapistHomeAssignmentsPage.tsx # Activity assignment page
│
├── progress/
│   └── ProgressMonitoringPage.tsx       # Progress view page
│
├── progress-analytics/
│   └── TherapistProgressAnalyticsPage.tsx  # Analytics page
│
├── reports/
│   ├── TherapistReportsPage.tsx         # Therapist reports
│   └── index.ts                         # Reports exports
│
├── therapy-oversight/
│   └── TherapyOversightPage.tsx         # Therapy overview page
│
├── schedule/
│   └── index.tsx                        # Schedule page
│
├── case/
│   └── TherapistCaseFilePage.tsx        # Case file page
│
├── cases/
│   ├── ChildCaseDetailPage.tsx          # Case detail page
│   └── ChildCaseListPage.tsx            # Case list page
│
├── activity-library/
│   └── ActivityLibraryPage.tsx          # Activity library page
│
└── notifications/
    └── NotificationsPage.tsx            # Notifications page
```

---

### 🧪 **SECTION 4: TESTING** (10 files)

**Unit Tests:**
```
src/__tests__/
├── App.test.tsx                         # App routing tests
├── AuthContext.test.tsx                 # Auth context tests
├── AuthForm.flow.test.tsx               # Login form flow tests
├── ClinicalEvaluationTab.test.tsx       # Evaluation tab tests
├── DashboardLayout.test.tsx             # Layout tests
├── ProtectedRoute.test.tsx              # Route guard tests
└── ScreeningReviews.test.tsx            # Screening review tests
```

**E2E Tests (Playwright):**
```
tests/e2e/
├── auth-workflows.spec.js               # Login/logout flows
├── home-assignments-loop.spec.js        # Assignment completion
├── lab-release-flow.spec.js             # Lab workflow
└── screening-flow.spec.js               # Screening flow
```

---

### 📊 **SECTION 5: STYLES** (3 files)

```
src/index.css                           # Global CSS resets
src/App.css                             # App-level styles
src/styles/globals.css                  # Additional global styles
```

---

## 🔙 **SECTION 6: BACKEND SERVER** (server/)

### **6.1 Root Configuration** (4 files)

```
server/package.json                     # Backend npm dependencies
server/package-lock.json                # Locked versions
server/jest.config.cjs                  # Jest test configuration
server/src/server.js                    # Express server entry point
```

### **6.2 Database Models** (29 files)

Located in `server/src/models/`:
```
User.js                                 # User accounts (all roles)
ChildCase.js                            # Main case entity
Child.js                                # Child (embedded in case)
Appointment.js                          # Appointment booking
AppointmentRequest.js                   # Pending appointments
Questionnaire.js                        # ASQ-3/M-CHAT-R data
ClinicalEvaluation.js                   # Clinician evaluation
ClinicianNotes.js                       # Clinical notes
Referral.js                             # Referral recommendation
TherapyCase.js                          # Therapy workflow
TherapyPlan.js                          # Therapy plan details
TherapySchedule.js                      # Session schedule
TherapyEpisode.js                       # Therapy episode tracking
SessionLog.js                           # Individual session record
SessionSlot.js                          # Available session slots
HomeAssignment.js                       # Activity assignment
Submission.js                           # Assignment submission
Activity.js                             # Activity template
LabRequest.js                           # Lab test request
LabTestRequest.js                       # Specific test request
LabTestOrder.js                         # Lab order
LabTest.js                              # Test definition
LabReport.js                            # Lab report
LabApproval.js                          # Lab approval workflow
Message.js                              # Chat message
Conversation.js                         # Message thread
Notification.js                         # Notification record
Report.js                               # Generated report
ProgressSnapshot.js                     # Progress metrics
AuditLog.js                             # Audit log entry
AuditEvent.js                           # Audit event type
```

### **6.3 Controllers** (24 files)

Located in `server/src/controllers/` - Handle HTTP request logic:
```
auth.controller.js                      # Login/signup/JWT
admin.controller.js                     # Admin operations
appointment.controller.js               # Appointment management
parent.controller.js                    # Parent endpoint
clinician.controller.js                 # Clinician endpoint
therapist.controller.js                 # Therapist endpoint
therapistDashboardController.js         # Therapist dashboard
therapistCaseController.js              # Therapist case ops
child.controller.js                     # Child profile
caseController.js                       # Case operations
screening.controller.js                 # Screening workflows
evaluationController.js                 # Evaluation management
referralController.js                   # Referral operations
therapyController.js                    # Therapy operations
therapyPlanController.js                # Therapy plan CRUD
sessionController.js                    # Session logging
scheduleController.js                   # Schedule management
homeAssignment.controller.js            # Assignment management
activityController.js                   # Activity operations
activityTemplateController.js           # Activity templates
messageController.js                    # Messaging
notification.controller.js              # Notifications
lab.controller.js                       # Lab operations
labRequestController.js                 # Lab request CRUD
labTestController.js                    # Lab test management
reportController.js                     # Report generation
progressController.js                   # Progress tracking
progressEngineController.js             # Progress engine
analyticsController.js                  # Analytics
facialScreening.controller.js            # ML facial screening
integrationController.js                # Cross-module integration
```

### **6.4 Routes** (26 files)

Located in `server/src/routes/` - API endpoint definitions:
```
auth.routes.js                          # /api/auth/*
parent.routes.js                        # /api/parent/*
clinician.routes.js                     # /api/clinician/*
therapist.routes.js                     # /api/therapist/*
admin.routes.js                         # /api/admin/*
child.routes.js                         # /api/child/*
case.routes.js                          # /api/case/*
appointment.routes.js                   # /api/appointment/*
screening.routes.js                     # /api/screening/*
evaluationRoutes.js                     # /api/evaluation/*
referralRoutes.js                       # /api/referral/*
therapyRoutes.js                        # /api/therapy/*
therapyPlanRoutes.js                    # /api/therapy-plan/*
sessionRoutes.js                        # /api/session/*
scheduleRoutes.js                       # /api/schedule/*
homeAssignmentRoutes.js                 # /api/assignment/*
activityRoutes.js                       # /api/activity/*
messageRoutes.js                        # /api/message/*
notification.routes.js                 # /api/notification/*
lab.routes.js                           # /api/lab/*
labRequestRoutes.js                     # /api/lab-request/*
labTestRoutes.js                        # /api/lab-test/*
reportRoutes.js                         # /api/report/*
progressRoutes.js                       # /api/progress/*
progressEngineRoutes.js                 # /api/progress-engine/*
analyticsRoutes.js                      # /api/analytics/*
facialScreening.routes.js               # /api/facial-screening/*
therapistChildren.routes.js             # /api/therapist/children/*
therapistCaseRoutes.js                  # /api/therapist/case/*
integrationRoutes.js                    # /api/integration/*
```

### **6.5 Services** (12 files)

Located in `server/src/services/` - Business logic & utilities:
```
emailService.js                         # Email sending via SendGrid
decisionEngine.js                       # CDSS decision logic
childCase.service.js                    # Child case operations
caseLifecycleService.js                 # Case state management
caseAnalyticsV2.js                      # Analytics computation
caseAnalyticsSnapshot.js                # Analytics snapshots
actionPermissionService.js              # Permission checking
therapyEpisodeService.js                # Therapy episode logic
reportGenerator.js                      # Report generation
reportPdfService.js                     # PDF generation
screeningOrchestrator.js                # Screening workflow
progressEngine.js                       # Progress calculation
```

### **6.6 Middleware** (6 files)

Located in `server/src/middleware/`:
```
auth.middleware.js                      # JWT verification & role check
rbac.middleware.js                      # Role-based access control
labAccess.middleware.js                 # Lab endpoint access
uploadValidation.js                     # File upload validation
uploadHomeAssignmentEvidence.js         # Assignment upload handler
validateCaseState.js                    # Case state validation
```

### **6.7 Utilities** (22 files)

Located in `server/src/utils/`:
```
email.js                                # Email utilities
encryption.js                           # Data encryption
auditLog.js                             # Audit logging
audit.js                                # Audit utilities
notification.js                         # Notification logic
caseAccess.js                           # Case access control
therapistCaseAccess.js                  # Therapist case access
ageUtils.js                             # Age calculation
MchatScoring.js                         # M-CHAT-R scoring
ASQscoring.js                           # ASQ-3 scoring
ASQinterval.js                          # ASQ-3 age intervals
asqCutoffs.js                           # ASQ-3 cutoff values
therapyPlanLifecycle.js                 # Therapy plan states
planBaselineLock.js                     # Lock baseline data
sessionGoalDataValidation.js            # Validate session goals
sessionLogShared.js                     # Session log utilities
sessionResponseScore.js                 # Score session responses
sessionSlotLink.js                      # Session slot linking
screeningReportPdf.js                   # Screening report PDF
normalizeWorkflowStatus.js              # Normalize workflow states
labCaseIntegration.js                   # Lab-case linking
generateSessionSlots.js                 # Generate available slots
time.js                                 # Time utilities
CDSS_RULESET.md                         # CDSS rule documentation
```

### **6.8 Configuration** (1 file)

```
server/src/config/database.js           # MongoDB connection
```

### **6.9 Constants** (1 file)

```
server/src/constants/workflowEnums.js   # Workflow state constants
```

### **6.10 Email Templates** (2 files)

```
server/src/emailTemplates/appointmentConfirmationTemplate.js
server/src/emailTemplates/screeningResultTemplate.js
```

### **6.11 Data Seeders** (6 files)

Located in `server/src/seeders/`:
```
usersSeeder.js                          # Seed test users
seedActivityTemplates.js                # Seed activity templates
mchat.seed.js                           # Seed M-CHAT-R questions
asq.seed.js                             # Seed ASQ-3 questions
labSeeder.js                            # Seed lab data
data/mchat.json                         # M-CHAT-R data
data/asq.json                           # ASQ-3 data
```

### **6.12 Testing** (26 files)

Located in `server/tests/`:

**Integration Tests:**
```
integration/
├── workflow.integration.test.js         # End-to-end workflows
├── auth.integration.test.js             # Auth flows
├── screening.integration.test.js        # Screening workflows
├── screening-advanced.integration.test.js
├── screening-asq-edge.integration.test.js
├── screening-clinician-decision.integration.test.js
├── therapy-chain.integration.test.js    # Therapy chain
├── therapy-plan-approval.integration.test.js
├── therapy-plan-advanced.integration.test.js
├── therapy-plan-edge-deep.integration.test.js
├── therapy-plan-stress-race.integration.test.js
├── schedule-advanced.integration.test.js
├── schedule-slot-transition-matrix.integration.test.js
├── evaluation.integration.test.js
├── evaluation-advanced.integration.test.js
├── session-logging.integration.test.js  # Session tests
├── home-assignment-edge.integration.test.js
├── appointments-exceptional-bva.integration.test.js
├── referrals-exceptional-bva.integration.test.js
├── messaging-advanced.integration.test.js
├── notifications-advanced.integration.test.js
├── performance-resilience.integration.test.js
├── lab-advanced.integration.test.js
├── activity-library-advanced.integration.test.js
├── reports-advanced.integration.test.js
├── progress-analytics.integration.test.js
├── security-authz.integration.test.js
├── security-fuzz.integration.test.js
├── admin-security.integration.test.js
├── modules-messaging-notifications-lab-admin-activity.integration.test.js
├── role-module-smoke.test.js
├── exceptional-bva.integration.test.js
```

**Test Helpers:**
```
helpers/
├── testDb.js                            # Test database setup
└── authHelpers.js                       # Auth helper functions
```

### **6.13 File Uploads** (5 directories)

```
server/src/uploads/
├── appointment-documents/               # Appointment files
├── documents/                           # General documents
├── facial-screening/                    # Facial screening images
├── home-assignments/                    # Assignment submissions
├── lab-reports/                         # Lab PDFs
└── reports/                             # Generated reports
```

---

## 🤖 **SECTION 7: MACHINE LEARNING MODULE** (server/ml/)

### **7.1 Facial Screening Service**

Located in `server/ml/facial_screening_service/`:
```
app.py                                  # FastAPI server entry
requirements.txt                        # Python dependencies
labeling.py                             # Label mapping logic
test_label_mapping.py                   # Label tests
README.md                               # ML documentation
__pycache__/                            # Compiled Python
```

**ML Service Architecture:**
- Runs on separate port (8001) with Python 3.11/3.12
- Uses TensorFlow for facial analysis
- Returns `face_detected` and `quality_warning` signals
- Supports OpenCV face-focused cropping

---

## 📚 **SECTION 8: DOCUMENTATION** (6 files)

Located in root:
```
README.md                               # Project overview
SYSTEM_ARCHITECTURE.md                  # Architecture diagram (Mermaid)
SYSTEM_QA_CHECKLIST.md                  # QA testing checklist
TEST_FEATURE_STATUS.md                  # Test coverage status
THERAPY_MODULE_DOCUMENTATION.md         # Therapy feature docs
UNIFIED_SYSTEM_DOCUMENTATION.md         # Complete system docs
OTHER_MODULES_DOCUMENTATION.md          # Other module docs
```

---

## ⚙️ **SECTION 9: CONFIGURATION & DEPLOYMENT** (7 files)

```
package.json                            # Root monorepo package
package-lock.json                       # Locked versions
.gitignore                              # Git ignore rules
.github/workflows/ci.yml                # GitHub Actions CI/CD
.vscode/settings.json                   # VS Code workspace settings
render.yaml                             # Render deployment config
fnm-install.ps1                         # Node version manager setup
volta-install.sh                        # Volta setup script
install.sh                              # Installation script
nvm-setup.exe                           # NVM installer
```

---

## 🎨 **CURRENT DESIGN SYSTEM**

### **Color Palette (Calm Redesign - In Progress)**
```
Primary: Soft Blue (#4B7EC4, #E8F0FA variants)
Secondary: Soft Green (#6ABD8A, #E8F4F0 variants)
Accent: Soft Lavender (#A99BCC, #F5F3FA variants)
Status Colors:
  - Success: Green shades
  - Warning: Amber shades
  - Error: Red shades
  - Info: Blue shades
```

### **Typography**
- Font System: System fonts + Tailwind defaults
- Heading: Bold, larger sizes for hierarchy
- Body: Regular weight for readability
- Mono: For code/data display

### **Spacing**
- Tailwind's default 4px scale (p-1 = 4px, p-2 = 8px, etc.)
- Card padding: p-6 (24px)
- Section spacing: space-y-6 (24px gaps)

### **Shadows & Elevation**
- shadow-sm: Subtle shadows for interactive elements
- shadow-md: Standard elevation
- shadow-lg: Modals & important overlays

### **Responsive Design**
- Mobile-first approach
- Breakpoints: sm, md, lg, xl via Tailwind
- Mobile drawer vs desktop sidebar
- Table becomes scrollable on mobile

---

## 🔐 **AUTHENTICATION & ROLES FLOW**

### **User Roles in AuthContext:**
```typescript
enum UserRole {
  PARENT = 'parent',
  CLINICIAN = 'clinician',
  THERAPIST = 'therapist',
  LAB = 'lab',
  ADMIN = 'admin'
}
```

### **Route Protection:**
- All routes wrapped in `<ProtectedRoute>`
- Checks `authReady` before redirect (prevents logout bounce)
- Role-based dashboard routing via `DashboardLayout`

---

## 📊 **KEY DATA FLOWS FOR UI REFACTORING**

### **1. Screening Flow (Parent)**
```
Parent Dashboard → Select Questionnaire
  → ASQ-3/M-CHAT-R Form (Guided UI)
  → Submit → Results Display
  → Recommendation (Auto-generated by CDSS)
  → Book Appointment
```

### **2. Referral to Therapy Flow (Clinician → Therapist)**
```
Clinician Reviews Screening
  → Add Clinical Notes + Evaluation
  → Create Referral Recommendation
  → Therapist Receives Referral
  → Create Therapy Plan from Template
  → Assign Sessions & Activities
  → Parent Sees Home Assignments
```

### **3. Session Logging (Therapist)**
```
Therapist Dashboard
  → Select Child Case
  → Log Session (Form with date, goals, notes)
  → Assign Home Activities
  → Generate Progress Report
  → System Auto-Updates Progress Metrics
```

### **4. Lab Integration**
```
Clinician Requests Lab Test
  → Lab Receives Request (LabDashboard)
  → Lab Uploads Report/Image
  → Clinician Reviews → Approves
  → Parent Can View Results
```

### **5. Messaging (Cross-Role)**
```
Any Role Initiates Message in Case
  → Creates Conversation Thread
  → Real-time Messaging UI
  → Notifications for New Messages
  → Full Message History Accessible
```

---

## 🎯 **UI COMPONENT DENSITY & COMPLEXITY**

### **High-Complexity Components (Recommend Refactoring Priority)**
```
DashboardLayout.tsx (1000+ lines)       # Main navigation wrapper
TherapyPlanBuilder.tsx                  # Multi-step form
ActivityLibraryScreen.tsx               # Complex search/filter
CaseProgressAnalyticsDashboard.tsx      # Data visualization
ReportDocumentView.tsx                  # Document rendering
SessionForm.tsx                         # Complex form with validation
ASQ3Form.tsx / MCHATForm.tsx            # Long questionnaires
```

### **Medium-Complexity Components**
```
ClinicianDashboard.tsx                  # Dashboard with tabs
TherapistCaseFile.tsx                   # Multi-tab case view
ParentDashboard.tsx                     # Parent home
CaseMessagingInbox.tsx                  # Messaging interface
```

### **Low-Complexity Components (Reusable UI)**
```
CaseStatusBadge.jsx                     # Simple status display
NotificationBell.tsx                    # Icon with counter
AddChildForm.tsx                        # Basic form
```

---

## 📈 **FEATURE AREAS BY MODULE**

| Module | Core Features | Components | Routes | Controllers | Models |
|--------|--------------|-----------|--------|------------|--------|
| **Parent** | Screening, Child Mgmt, Appointments | 20+ | Parent | Parent | Child, Case, Appointment |
| **Clinician** | Evaluation, Referral, Notes | 12+ | Clinician | Clinician, Evaluation | Evaluation, Referral, Notes |
| **Therapist** | Therapy Plans, Sessions, Progress | 18+ | Therapist | Therapist, Therapy, Session | TherapyPlan, Session, Assignment |
| **Lab** | Test Requests, Report Upload | 10+ | Lab | Lab | LabRequest, LabReport |
| **Admin** | User Mgmt, Moderation, Analytics | 5+ | Admin | Admin | User, AuditLog |
| **Shared** | Messaging, Notifications, Auth | 15+ | Auth, Message | Notification, Message | Message, Notification |

---

## 🔗 **API ENDPOINT CATEGORIES**

```
Authentication:     /api/auth/*
Parent Functions:   /api/parent/*, /api/child/*, /api/appointment/*
Clinician:          /api/clinician/*, /api/evaluation/*, /api/referral/*
Therapist:          /api/therapist/*, /api/therapy/*, /api/session/*
Activities:         /api/activity/*, /api/assignment/*
Lab:                /api/lab/*, /api/lab-request/*, /api/lab-test/*
Messaging:          /api/message/*, /api/conversation/*
Notifications:      /api/notification/*
Reports:            /api/report/*, /api/progress/*
Analytics:          /api/analytics/*, /api/progress-engine/*
Cases:              /api/case/*, /api/screening/*
Admin:              /api/admin/*
Facial Screening:   /api/facial-screening/* (+ Python ML service on :8001)
```

---

## 🎓 **DESIGN REFACTORING RECOMMENDATIONS FOR FIGMAAI**

### **Phase 1: Design System Tokens**
- [ ] Define comprehensive Tailwind color tokens matching calm palette
- [ ] Create typography scale (h1-h6, body, caption)
- [ ] Define spacing system (margins, padding, gaps)
- [ ] Create elevation/shadow system

### **Phase 2: Component Library Audit**
- [ ] Review all 50+ shadcn/ui components for consistency
- [ ] Identify duplicate/similar components (consolidate)
- [ ] Add missing components if needed
- [ ] Create component variants (primary, secondary, danger)

### **Phase 3: Page Layouts**
- [ ] Redesign dashboard layouts (parent, clinician, therapist, lab, admin)
- [ ] Standardize data table displays
- [ ] Create modal/dialog standards
- [ ] Design responsive mobile layouts

### **Phase 4: Feature-Specific UI**
- [ ] **Screening UX**: Improve guided flow UI, result visualization
- [ ] **Therapy Planning**: Multi-step form clarity, template selection
- [ ] **Session Logging**: Form ergonomics for quick entry
- [ ] **Progress Analytics**: Data visualization (charts, metrics)
- [ ] **Messaging**: Chat bubble styling, timestamp grouping
- [ ] **Lab Integration**: Status timeline, report preview

### **Phase 5: Accessibility**
- [ ] Ensure WCAG 2.1 AA compliance
- [ ] Review contrast ratios against calm palette
- [ ] Test keyboard navigation
- [ ] Verify screen reader compatibility

---

## 📦 **BUILD & DEPLOYMENT INFO**

**Development:**
```bash
npm run dev              # Vite client (:4173) + Express server (:4000)
```

**Testing:**
```bash
npm test                # Vitest client tests
npm run test:e2e       # Playwright e2e tests
```

**Production Build:**
```bash
npm run build           # Vite build to dist/
```

**Deployment:**
- Client: Vercel (configured in `vercel.json`)
- Server: Render.yaml configuration
- ML Service: Python FastAPI on separate port

---

## 📝 **ADDITIONAL NOTES FOR FIGMAAI**

1. **Color Accessibility**: Current soft palette is beautiful but low-contrast for some statuses—verify WCAG compliance
2. **Mobile-First Design**: Many components need mobile refinement (tables, modals, navigation)
3. **Form Complexity**: Long questionnaires (ASQ-3, M-CHAT-R) need UX polish for mobile
4. **Real-Time Updates**: Messaging and notifications should reflect live updates in UI
5. **Progress Visualization**: Consider data viz improvements for progress/analytics pages
6. **Empty States**: Add empty state illustrations across all list views
7. **Loading States**: Skeleton screens throughout for better perceived performance
8. **Error Handling**: Standardize error message styling and placement
9. **Onboarding**: Guided tours for first-time users in each role
10. **Dark Mode**: Consider dark theme support (scaffolding exists with ThemeToggleButton)

---

## 🎯 **SUMMARY TABLE: File Organization by Purpose**

| Purpose | File Count | Key Locations | Notes |
|---------|-----------|---------------|-------|
| **UI Components** | 90+ | `src/components/*` | shadcn/ui + custom |
| **Pages** | 25+ | `src/pages/*` | Full-page views |
| **Backend Controllers** | 24 | `server/src/controllers/*` | Request handlers |
| **Database Models** | 29 | `server/src/models/*` | MongoDB schemas |
| **API Routes** | 26 | `server/src/routes/*` | Endpoint definitions |
| **Business Logic** | 12 | `server/src/services/*` | Core operations |
| **Utilities** | 22 | `server/src/utils/*` | Helper functions |
| **Integration Tests** | 26 | `server/tests/integration/*` | End-to-end tests |
| **E2E Tests** | 4 | `tests/e2e/*` | Playwright tests |
| **ML Service** | 5 | `server/ml/*` | FastAPI facial screening |
| **Configuration** | 20+ | Root, `.vscode/`, etc | Build & deploy config |
| **Documentation** | 8 | Root `*.md` | Architecture & guides |
| **Total** | **469** | | Complete system |

---

**Generated:** April 26, 2026  
**For:** FigmaAI UI Design Refactoring Initiative  
**Next Steps:** Import this analysis into Figma's AI design prompt for comprehensive UI/UX redesign across all 5 user roles.
