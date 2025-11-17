// [HR PORTAL] src/App.jsx
import React, { useState, useEffect, useContext, createContext } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, getIdTokenResult, signOut } from "firebase/auth";
import { auth, db } from './firebase/config'; 

// --- ADMIN COMPONENTS ---
import { LoginScreen } from './components/LoginScreen';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { CompanyAdminDashboard } from './components/CompanyAdminDashboard';
import { CompanyChooserModal } from './components/CompanyChooserModal';
import { CompanySettings } from './components/admin/CompanySettings'; 
import GlobalLoadingState from './components/feedback/GlobalLoadingState'; 

// --- CONTEXT ---
const DataContext = createContext();
export const useData = () => useContext(DataContext);

// --- INNER COMPONENT: Handles Auth & Routing Logic ---
function AppContent() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserClaims, setCurrentUserClaims] = useState(null);
  const [currentCompanyProfile, setCurrentCompanyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompanyChooser, setShowCompanyChooser] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // -- Auth Listener --
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          // Force refresh token to get latest claims
          const idTokenResult = await getIdTokenResult(user, true);
          const claims = idTokenResult.claims;
          setCurrentUserClaims(claims);
          
          // --- REDIRECT LOGIC ---
          const isSuperAdmin = claims.roles?.globalRole === 'super_admin';

          if (location.pathname === '/login' || location.pathname === '/') {
             if (isSuperAdmin) {
                navigate('/super-admin');
             } else {
                // Regular admin or user - check if they have a company selected
                if (currentCompanyProfile) {
                    navigate('/company/dashboard');
                } else {
                    // They need to pick a company first
                    // We stay on a "neutral" page or just show the modal over the dashboard
                    setShowCompanyChooser(true);
                    navigate('/company/dashboard'); 
                }
             }
          }
        } catch (e) {
          console.error("Error getting claims:", e);
        }
      } else {
        // Not logged in
        setCurrentUser(null);
        setCurrentUserClaims(null);
        setCurrentCompanyProfile(null);
        if (location.pathname !== '/login') {
            navigate('/login');
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]); // Depend only on auth state changes

  const loginToCompany = async (companyId, role) => {
    setLoading(true);
    try {
      const companyDoc = await getDoc(doc(db, "companies", companyId));
      if (companyDoc.exists()) {
        const companyData = { id: companyDoc.id, ...companyDoc.data() };
        setCurrentCompanyProfile(companyData);
        setShowCompanyChooser(false);
        navigate('/company/dashboard');
      }
    } catch (error) {
      console.error("Error logging into company:", error);
      alert("Failed to load company.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentCompanyProfile(null);
    setCurrentUserClaims(null);
    navigate('/login');
  };

  const returnToCompanyChooser = () => {
    setCurrentCompanyProfile(null);
    navigate('/company/dashboard'); 
    setShowCompanyChooser(true);
  };

  const adminContextValue = {
    currentUser,
    currentUserClaims,
    currentCompanyProfile,
    loginToCompany,
    handleLogout,
    returnToCompanyChooser
  };

  if (loading) return <GlobalLoadingState />;

  return (
    <DataContext.Provider value={adminContextValue}>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        
        {/* Company Dashboard Routes */}
        <Route path="/company/dashboard" element={
           // If no company selected, we render an empty div but the Modal will be on top
           <CompanyAdminDashboard /> 
        } />
        
        <Route path="/company/settings" element={
           currentCompanyProfile ? <CompanySettings /> : <Navigate to="/company/dashboard" />
        } />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      
      {/* Show Modal if logged in, not super admin, and no company selected */}
      {currentUser && !currentCompanyProfile && currentUserClaims?.roles && !currentUserClaims.roles.globalRole && (
        <CompanyChooserModal />
      )}
    </DataContext.Provider>
  );
}

// --- MAIN APP COMPONENT ---
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;