// src/App.jsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from './firebase/config.js';
import { getUserClaims, handleLogout } from './firebase/auth.js';
import { getCompanyProfile } from './firebase/firestore.js';

import { LoginScreen } from './components/LoginScreen.jsx';
import { CompanyChooserModal } from './components/CompanyChooserModal.jsx';
import { CompanyAdminDashboard } from './components/CompanyAdminDashboard.jsx';
// --- NEW ---
import { SuperAdminDashboard } from './components/SuperAdminDashboard.jsx';
// --- END NEW ---

// Create a Context to share data with all components
const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

function App() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('login'); // 'login', 'super_admin', 'company_admin', 'chooser'
  
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserClaims, setCurrentUserClaims] = useState(null);
  const [currentCompanyProfile, setCurrentCompanyProfile] = useState(null);

  // This function is called after login OR from the company chooser
  const loginToCompany = async (companyId, role) => {
    console.log(`Logging into company ${companyId} with role ${role}`);
    setLoading(true);
    
    const companyData = await getCompanyProfile(companyId);
    if (!companyData) {
      console.error("Could not load company profile! Logging out.");
      handleLogout();
      return;
    }
    
    // UPDATED: Store the ID on the profile object for easy access
    companyData.id = companyId;
    setCurrentCompanyProfile(companyData);
    setView('company_admin');
    setLoading(false);
  };

  // This lets a user go from the dashboard back to the chooser modal
  const returnToCompanyChooser = () => {
    if (!currentUserClaims || !currentUser) {
      handleLogout();
      return;
    }
    setCurrentCompanyProfile(null);
    setView('chooser');
  };

  // This useEffect hook runs once and handles all auth logic
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Reset all state on auth change
      setCurrentUser(null);
      setCurrentUserClaims(null);
      setCurrentCompanyProfile(null);
      setLoading(true);

      if (user) {
        setCurrentUser(user);
        const claims = await getUserClaims(user, true);
        setCurrentUserClaims(claims);

        if (!claims || !claims.roles) {
          console.error("User has no claims or roles! Logging out.");
          handleLogout();
          return;
        }

        // --- Role-Based Router ---
        if (claims.roles.globalRole === 'super_admin') {
          console.log("Redirecting to Super Admin Dashboard");
          setView('super_admin');
        } else {
          const companyRoles = { ...claims.roles };
          delete companyRoles.globalRole;
          const companyIds = Object.keys(companyRoles);

          if (companyIds.length === 0) {
            console.error("Admin user has no company memberships! Logging out.");
            handleLogout();
          } else if (companyIds.length === 1) {
            const companyId = companyIds[0];
            const role = companyRoles[companyId];
            loginToCompany(companyId, role); // Log in directly
          } else {
            console.log("User has multiple companies. Showing chooser modal.");
            setView('chooser'); // Show company chooser
          }
        }
      } else {
        // User is logged out
        setView('login');
      }
      
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // --- Render logic based on state ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <h2 className="text-2xl font-bold text-gray-800">Loading...</h2>
      </div>
    );
  }

  // This is the data we'll provide to all child components
  const contextValue = {
    currentUser,
    currentUserClaims,
    currentCompanyProfile,
    handleLogout,
    returnToCompanyChooser,
    loginToCompany
  };

  return (
    <DataContext.Provider value={contextValue}>
      <div className="app-container">
        {view === 'login' && (
          <LoginScreen />
        )}
        {view === 'super_admin' && (
          <SuperAdminDashboard />
        )}
        {view === 'company_admin' && (
           <CompanyAdminDashboard />
        )}
        {view === 'chooser' && (
           <CompanyChooserModal />
        )}
      </div>
    </DataContext.Provider>
  );
}

export default App;
