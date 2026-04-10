import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import AuthForm from "./components/AuthForm";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "./components/ui/sonner";

const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ClinicianDashboard = lazy(() =>
  import("./components/clinician/ClinicianDashboard").then((m) => ({ default: m.ClinicianDashboard }))
);
const ParentDashboard = lazy(() =>
  import("./components/parent/ParentDashboard").then((m) => ({ default: m.ParentDashboard }))
);
const ParentChildCasePage = lazy(() =>
  import("./components/parent/ParentChildCasePage").then((m) => ({ default: m.ParentChildCasePage }))
);
const ParentCaseEntry = lazy(() =>
  import("./components/parent/ParentCaseEntry").then((m) => ({ default: m.ParentCaseEntry }))
);
const LabDashboard = lazy(() =>
  import("./components/lab/LabDashboard").then((m) => ({ default: m.LabDashboard }))
);
const TherapistDashboard = lazy(() =>
  import("./components/therapist/TherapistDashboard").then((m) => ({ default: m.TherapistDashboard }))
);
const TherapistCaseFile = lazy(() =>
  import("./components/therapist/TherapistCaseFile").then((m) => ({ default: m.TherapistCaseFile }))
);
const TherapistSessionsListPage = lazy(() => import("./pages/sessions/TherapistSessionsListPage"));
const LogTherapySessionPage = lazy(() => import("./pages/sessions/LogTherapySessionPage"));
const SchedulePage = lazy(() => import("./pages/schedule"));
const TherapistProgressAnalyticsPage = lazy(() => import("./pages/progress-analytics/TherapistProgressAnalyticsPage"));
const ScreeningForm = lazy(() => import("./components/ScreeningForm"));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-slate-50/80 text-sm text-slate-500">
      Loading…
    </div>
  );
}

function App() {
  return (
    <>
      <Toaster position="top-center" richColors closeButton />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<AuthForm />} />
          <Route path="/login" element={<AuthForm />} />
          <Route path="/register" element={<AuthForm />} />

          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />

          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/parent-dashboard"
            element={
              <ProtectedRoute roles={["parent"]}>
                <ParentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/case"
            element={
              <ProtectedRoute roles={["parent"]}>
                <ParentCaseEntry />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/case/:caseId"
            element={
              <ProtectedRoute roles={["parent"]}>
                <ParentChildCasePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/clinician-dashboard"
            element={
              <ProtectedRoute roles={["clinician"]}>
                <ClinicianDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/lab-dashboard"
            element={
              <ProtectedRoute roles={["lab"]}>
                <LabDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/therapist-dashboard"
            element={
              <ProtectedRoute roles={["therapist"]}>
                <TherapistDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/therapist/case/:caseId"
            element={
              <ProtectedRoute roles={["therapist"]}>
                <TherapistCaseFile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/therapist/sessions"
            element={
              <ProtectedRoute roles={["therapist"]}>
                <TherapistSessionsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/therapist/sessions/new"
            element={
              <ProtectedRoute roles={["therapist"]}>
                <LogTherapySessionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute roles={["therapist"]}>
                <SchedulePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/therapist/progress-analytics"
            element={
              <ProtectedRoute roles={["therapist"]}>
                <TherapistProgressAnalyticsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/screening"
            element={
              <ProtectedRoute roles={["parent", "clinician", "therapist"]}>
                <ScreeningForm />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
