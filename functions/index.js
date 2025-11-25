// src/App.jsx
import React, { useState, useEffect, useContext, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from './firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

// --- COMPONENTS ---
import { Login } from './components/public/Login.jsx';
import { Register } from './components/public/Register.jsx';
import { TeamMemberSignup } from './components/public/TeamMemberSignup.jsx'; // <--- NEW IMPORT
import { SuperAdminDashboard } from './components/SuperAdminDashboard.jsx';
import { CompanyAdminDashboard } from './components/CompanyAdminDashboard.jsx';
import { CompanyChooser } from './components/CompanyChooser.jsx';

// --- GLOBAL CONTEXT ---
const DataContext = createContext();
export const useData = () => useContext(DataContext);

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserClaims, setCurrentUserClaims] = useState(null);
  const [currentCompanyProfile, setCurrentCompanyProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
            // Force refresh token to get latest claims
            const tokenResult = await user.getIdTokenResult(true);
            setCurrentUser(user);
            setCurrentUserClaims(tokenResult.claims);
        } catch (e) {
            console.error("Auth Error:", e);
        }
      } else {
        setCurrentUser(null);
        setCurrentUserClaims(null);
        setCurrentCompanyProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    window.location.href = '/login';
  };

  const returnToCompanyChooser = () => {
    setCurrentCompanyProfile(null);
    window.location.href = '/company'; 
  };

  if (loading) {
    return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
    );
  }

  const value = {
    currentUser,
    currentUserClaims,
    currentCompanyProfile,
    setCurrentCompanyProfile,
    handleLogout,
    returnToCompanyChooser
  };

  return (
    <DataContext.Provider value={value}>
      <Router>
        <Routes>
          {/* --- PUBLIC ROUTES --- */}
          <Route path="/login" element={!currentUser ? <Login /> : <RootRedirect />} />
          <Route path="/register" element={!currentUser ? <Register /> : <RootRedirect />} />
          
          {/* NEW: Invite Link Route (Public) */}
          <Route path="/join/:companyId" element={<TeamMemberSignup />} />

          {/* --- PROTECTED ROUTES --- */}
          <Route path="/super-admin" element={
            <ProtectedRoute requiredRole="super_admin">
              <SuperAdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/company" element={
            <ProtectedRoute>
              <CompanyChooser />
            </ProtectedRoute>
          } />

          {/* Company Dashboard Wrapper to load Company Data */}
          <Route path="/company/:companyId/*" element={
            <ProtectedRoute>
              <CompanyLoader />
            </ProtectedRoute>
          } />

          {/* Default Redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </DataContext.Provider>
  );
}

// --- HELPER COMPONENTS ---

function RootRedirect() {
  const { currentUser, currentUserClaims } = useData();
  
  if (!currentUser) return <Navigate to="/login" />;
  
  // If Super Admin -> Go to Super Admin Dash
  if (currentUserClaims?.roles?.globalRole === 'super_admin') {
      return <Navigate to="/super-admin" />;
  }
  
  // Otherwise -> Go to Company Chooser
  return <Navigate to="/company" />;
}

function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, currentUserClaims } = useData();

  if (!currentUser) return <Navigate to="/login" />;

  if (requiredRole === 'super_admin') {
      if (currentUserClaims?.roles?.globalRole !== 'super_admin') {
          return <Navigate to="/company" />;
      }
  }

  return children;
}

// Loads company data based on URL param before showing dashboard
function CompanyLoader() {
    const { companyId } = useParams();
    const { setCurrentCompanyProfile, currentCompanyProfile } = useData();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!companyId) return;
        
        // If we already have the correct company loaded, skip fetch
        if (currentCompanyProfile && currentCompanyProfile.id === companyId) {
            setLoading(false);
            return;
        }

        const fetchCompany = async () => {
            try {
                const docRef = doc(db, "companies", companyId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setCurrentCompanyProfile({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setError("Company not found.");
                }
            } catch (e) {
                console.error(e);
                setError("Error loading company.");
            } finally {
                setLoading(false);
            }
        };
        fetchCompany();
    }, [companyId]);

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>;
    if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

    return <CompanyAdminDashboard />;
}