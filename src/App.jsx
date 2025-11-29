// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// --- CONTEXT & PROVIDERS ---
import { DataProvider, useData } from './context/DataContext';
import { ToastProvider } from './components/feedback/ToastProvider';
import ErrorBoundary from './components/feedback/ErrorBoundary'; // <-- NEW IMPORT

// --- COMPONENTS ---
import { LoginScreen } from './components/LoginScreen.jsx';
import { TeamMemberSignup } from './components/public/TeamMemberSignup.jsx';
import { SuperAdminDashboard } from './components/SuperAdminDashboard.jsx';
import { CompanyAdminDashboard } from './components/CompanyAdminDashboard.jsx';
import { CompanySettings } from './components/admin/CompanySettings.jsx';

// --- HELPER COMPONENTS ---

function RootRedirect() {
  const { currentUser, currentUserClaims } = useData();

  if (!currentUser) return <Navigate to="/login" />;

  if (currentUserClaims?.roles?.globalRole === 'super_admin') {
      return <Navigate to="/super-admin" />;
  }

  return <Navigate to="/company/dashboard" />;
}

function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, currentUserClaims } = useData();

  if (!currentUser) return <Navigate to="/login" />;

  if (requiredRole === 'super_admin') {
      if (currentUserClaims?.roles?.globalRole !== 'super_admin') {
          return <Navigate to="/company/dashboard" />;
      }
  }

  return children;
}

// --- MAIN ROUTING LOGIC ---

function AppRoutes() {
  const { currentUser, currentCompanyProfile } = useData();

  return (
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route 
          path="/login" 
          element={!currentUser ? <LoginScreen /> : <RootRedirect />} 
        />
        <Route path="/join/:companyId" element={<TeamMemberSignup />} />

        {/* --- PROTECTED ROUTES --- */}
        <Route path="/super-admin" element={
          <ProtectedRoute requiredRole="super_admin">
            <SuperAdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/company/dashboard" element={
           <ProtectedRoute>
             {currentCompanyProfile ? (
               <CompanyAdminDashboard />
             ) : (
               // If authenticated but no profile loaded yet (or chooser active)
               // The Global Loader in Context usually covers this, but this is a safe fallback
               <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
                   Select a company...
               </div>
             )}
           </ProtectedRoute>
        } />

        <Route path="/company/settings" element={
           <ProtectedRoute>
              {currentCompanyProfile ? <CompanySettings /> : <Navigate to="/company/dashboard" />}
           </ProtectedRoute>
        } />

        {/* Default Redirect */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <DataProvider> {/* DataProvider now wraps the router and handles the Modal */}
          <Router>
            <AppRoutes />
          </Router>
        </DataProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}