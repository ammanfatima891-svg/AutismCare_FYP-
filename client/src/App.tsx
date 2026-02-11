import { Routes, Route } from "react-router-dom";
import AuthForm from "./components/AuthForm";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import AdminDashboard from "./pages/AdminDashboard";
import { ClinicianDashboard } from "./components/clinician/ClinicianDashboard";
import { ParentDashboard } from "./components/parent/ParentDashboard";
import { LabDashboard } from "./components/lab/LabDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import ScreeningForm from "./components/ScreeningForm";

function App() {
  return (
    <Routes>
      {/* DEFAULT ROUTE */}
      <Route path="/" element={<AuthForm />} />

      {/* Auth Routes */}
      <Route path="/login" element={<AuthForm />} />
      <Route path="/register" element={<AuthForm />} />

      {/* Password Reset Routes */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Email Verification Route */}
      <Route path="/verify-email/:token" element={<VerifyEmail />} />

      {/* Admin Dashboard (Protected) */}
      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Parent Dashboard (Protected) */}
      <Route
        path="/parent-dashboard"
        element={
          <ProtectedRoute roles={["parent"]}>
            <ParentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Clinician Dashboard (Protected) */}
      <Route
        path="/clinician-dashboard"
        element={
          <ProtectedRoute roles={["clinician"]}>
            <ClinicianDashboard />
          </ProtectedRoute>
        }
      />

      {/* Lab Dashboard (Protected) */}
      <Route
        path="/lab-dashboard"
        element={
          <ProtectedRoute roles={["lab"]}>
            <LabDashboard />
          </ProtectedRoute>
        }
      />

      {/* Screening Form (Protected) */}
      <Route
        path="/screening"
        element={
          <ProtectedRoute roles={["parent", "clinician", "therapist"]}>
            <ScreeningForm />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
