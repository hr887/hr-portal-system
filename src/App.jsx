// src/App.jsx
import React, { useState, useEffect, useContext, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { auth, db } from './firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

// --- COMPONENTS ---
import { LoginScreen } from './components/LoginScreen.jsx';
import { TeamMemberSignup } from './components/public/TeamMemberSignup.jsx';
import { SuperAdminDashboard } from './components/SuperAdminDashboard.jsx';
import { CompanyAdminDashboard } from './components/CompanyAdminDashboard.jsx';
import { CompanySettings } from './components/admin/CompanySettings.jsx'; // <--- Added Import
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
      if (user) {
        setCurrentUser(user);
        try {
          const idTokenResult = await user.getIdTokenResult(true);
          const claims = idTokenResult.claims;
          setCurrentUserClaims(claims);
          
          if (claims.roles?.globalRole !== 'super_admin' && !currentCompanyProfile) {
              setShowCompanyChooser(true);
          }
        } catch (e) {
          console.error("Error getting claims:", e);
        }
      } else {
        setCurrentUser(null);
        setCurrentUserClaims(null);
        setCurrentCompanyProfile(null);
        setShowCompanyChooser(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginToCompany = async (companyId, role) => {
    setLoading(true);
    try {
      const companyDoc = await getDoc(doc(db, "companies", companyId));
      if (companyDoc.exists()) {
        const companyData = { id: companyDoc.id, ...companyDoc.data() };
        setCurrentCompanyProfile(companyData);
        setShowCompanyChooser(false);
      }
    } catch (error) {
      console.error("Error logging into company:", error);
      alert("Failed to load company.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    window.location.href = '/login';
  };

  const returnToCompanyChooser = () => {
    setCurrentCompanyProfile(null);
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
               <div className="min-h-screen bg-gray-50"></div>
             )}
           </ProtectedRoute>
        } />

        {/* FIX: This route now renders CompanySettings correctly */}
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