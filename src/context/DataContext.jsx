// src/context/DataContext.jsx
import React, { useState, useEffect, useContext, createContext } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { CompanyChooserModal } from '../components/CompanyChooserModal';

// Create the Context
const DataContext = createContext();

// Export the Hook
export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
};

// Export the Provider
export function DataProvider({ children }) {
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
          
          if (savedCompanyId) {
             // Validate they still have access
             await loginToCompany(savedCompanyId, null, true);
          } else {
             // No saved company. 
             // If Super Admin, they go to Super Admin Dash.
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
    // If manually clicking, show loading.
    // If auto-login, global loading covers it.
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
      {children}
      
      {/* Global Company Chooser Modal managed by Context */}
      {currentUser && showCompanyChooser && !loading && (
         <CompanyChooserModal />
      )}
    </DataContext.Provider>
  );
}