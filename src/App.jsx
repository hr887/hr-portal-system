// src/App.jsx
import React, { useState, useEffect, useContext, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from './firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

// --- COMPONENTS ---
import { LoginScreen } from './components/LoginScreen.jsx';
import { TeamMemberSignup } from './components/public/TeamMemberSignup.jsx';
import { SuperAdminDashboard } from './components/SuperAdminDashboard.jsx';
import { CompanyAdminDashboard } from './components/CompanyAdminDashboard.jsx';
import { CompanySettings } from './components/admin/CompanySettings.jsx';
import { CompanyChooserModal } from './components/CompanyChooserModal.jsx';

// --- GLOBAL CONTEXT ---
const DataContext = createContext();
export const useData = () => useContext(DataContext);

// --- INNER COMPONENT: Handles Auth & Routing Logic ---
function AppContent() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserClaims, setCurrentUserClaims] = useState(null);
  const [currentCompanyProfile, setCurrentCompanyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompanyChooser, setShowCompanyChooser] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setCurrentUser(user);
        try {
          // 1. Get Claims
          const idTokenResult = await user.getIdTokenResult(true);
          const claims = idTokenResult.claims;
          setCurrentUserClaims(claims);
          
          // 2. Check Persistence (Local Storage)
          const savedCompanyId = localStorage.getItem('selectedCompanyId');
          
          // Logic: If normal user (not super admin active view)
          // Note: Super admins might want to persist too, but usually they work from their own dash.
          // We'll allow persistence if the saved ID matches a role they have.
          
          if (savedCompanyId) {
             // Validate they still have access? (Optional, but good practice. loginToCompany will fail if doc doesn't exist or rules block it)
             await loginToCompany(savedCompanyId, null, true);
          } else {
             // No saved company. 
             // If Super Admin, they go to Super Admin Dash (handled by RootRedirect).
             // If Company User, show chooser.
             if (claims.roles?.globalRole !== 'super_admin' && !currentCompanyProfile) {
                 setShowCompanyChooser(true);
             }
          }

        } catch (e) {
          console.error("Error initializing user:", e);
        }
      } else {
        // Logged out
        setCurrentUser(null);
        setCurrentUserClaims(null);
        setCurrentCompanyProfile(null);
        setShowCompanyChooser(false);
        localStorage.removeItem('selectedCompanyId');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginToCompany = async (companyId, role, isAutoLogin = false) => {
    // If manually clicking, show loading. If auto-login, global loading covers it.
    if (!isAutoLogin) setLoading(true);
    
    try {
      const companyDoc = await getDoc(doc(db, "companies", companyId));
      if (companyDoc.exists()) {
        const companyData = { id: companyDoc.id, ...companyDoc.data() };
        setCurrentCompanyProfile(companyData);
        
        // Persist selection
        localStorage.setItem('selectedCompanyId', companyId);
        
        setShowCompanyChooser(false);
      } else {
        console.warn("Saved company ID no longer exists.");
        localStorage.removeItem('selectedCompanyId');
      }
    } catch (error) {
      console.error("Error logging into company:", error);
      alert("Failed to load company profile.");
      localStorage.removeItem('selectedCompanyId');
    } finally {
      if (!isAutoLogin) setLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem('selectedCompanyId');
    window.location.href = '/login';
  };

  const returnToCompanyChooser = () => {
    setCurrentCompanyProfile(null);
    localStorage.removeItem('selectedCompanyId');
    setShowCompanyChooser(true);
  };

  if (loading) {
    return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
    );
  }

  const contextValue = {
    currentUser,
    currentUserClaims,
    currentCompanyProfile,
    setCurrentCompanyProfile,
    loginToCompany,
    handleLogout,
    returnToCompanyChooser,
    setShowCompanyChooser,
    setLoading
  };

  return (
    <DataContext.Provider value={contextValue}>
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/login" element={!currentUser ? <LoginScreen /> : <RootRedirect />} />
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
               // If authenticated but no profile loaded yet (or chooser active), show blank or chooser
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

      {/* Global Company Chooser Modal */}
      {currentUser && showCompanyChooser && !loading && (
         <CompanyChooserModal />
      )}
    </DataContext.Provider>
  );
}

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

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}