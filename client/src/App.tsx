// client/src/App.tsx
import { useState, useContext } from 'react';
import { SignUpForm } from './components/SignUpForm';
import { LoginForm } from './components/LoginForm';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { ClinicianDashboard } from './components/clinician/ClinicianDashboard';
import { TherapistDashboard } from './components/therapist/TherapistDashboard';
import { LabDashboard } from './components/lab/LabDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { Toaster } from './components/ui/sonner';


type UserRole = 'parent' | 'doctor' | 'therapist' | 'laboratory' | 'admin';

interface User {
  _id: string;
  fullName: string;
  primaryRole: UserRole;
  roles: UserRole[];
  email: string;
}

export default function App() {
  const [showLogin, setShowLogin] = useState(true);
  const { user, logout } = useContext(AuthContext);

  const { login } = useContext(AuthContext);

  // login handler
  const handleLogin = (data: { user: User; token: string }) => {
  login(data); // store user + token in AuthContext
};

  const handleLogout = () => {
    logout();
  };

  // Render RBAC-based dashboard
  if (user) {
    switch (user.primaryRole) {
      case 'parent':
        return <ParentDashboard user={user} onLogout={handleLogout} />;
      case 'doctor':
        return <ClinicianDashboard user={user} onLogout={handleLogout} />;
      case 'therapist':
        return <TherapistDashboard user={user} onLogout={handleLogout} />;
      case 'laboratory':
        return <LabDashboard user={user} onLogout={handleLogout} />;
      case 'admin':
        return <AdminDashboard user={user} onLogout={handleLogout} />;
      default:
        return <div>Access Denied</div>;
    }
  }

  // Auth page (Sign Up / Login)
  return (
    <>
      <div className="min-h-screen flex">
        {/* Left side image for large screens */}
        <div className="hidden lg:flex lg:w-1/2 bg-blue-50 relative overflow-hidden">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80"
            alt="Healthcare"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-purple-600/90 flex items-center justify-center p-12">
            <div className="text-white max-w-md">
              <h1 className="mb-6">AutismCare</h1>
              <p className="text-xl opacity-90">
                A comprehensive platform connecting families, healthcare professionals, and specialists for autism care and support.
              </p>
            </div>
          </div>
        </div>

        {/* Right side form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <h1 className="text-blue-600 mb-2">AutismCare</h1>
            </div>

            {/* Toggle Login / SignUp */}
            <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setShowLogin(true)}
                className={`flex-1 py-2 px-4 rounded-md transition-all ${
                  showLogin ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setShowLogin(false)}
                className={`flex-1 py-2 px-4 rounded-md transition-all ${
                  !showLogin ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sign Up
              </button>
            </div>

            {showLogin ? <LoginForm onLogin={handleLogin} /> : <SignUpForm />}

            {/* Demo Access */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600 mb-3">Quick Demo Access</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleLogin('parent')}
                  className="py-2 px-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 transition-all text-xs"
                >
                  👨‍👩‍👧 Parent
                </button>
                <button
                  onClick={() => handleLogin('doctor')}
                  className="py-2 px-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg hover:from-teal-700 hover:to-blue-700 transition-all text-xs"
                >
                  🧑‍⚕️ Doctor
                </button>
                <button
                  onClick={() => handleLogin('therapist')}
                  className="py-2 px-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all text-xs"
                >
                  🧑‍🏫 Therapist
                </button>
                <button
                  onClick={() => handleLogin('laboratory')}
                  className="py-2 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all text-xs"
                >
                  🧪 Laboratory
                </button>
                <button
                  onClick={() => handleLogin('admin')}
                  className="col-span-2 py-2 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all text-xs"
                >
                  🧑‍💼 Administrator
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  );
}
