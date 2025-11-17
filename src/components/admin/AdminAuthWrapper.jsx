// src/components/admin/AdminAuthWrapper.jsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { auth } from '../../firebase/config';
import { useData } from '../../App'; 

export function AdminAuthWrapper({ children }) {
  const { 
    setCurrentUser, 
    setCurrentUserClaims, 
    currentCompanyProfile, 
    setShowCompanyChooser,
    setLoading 
  } = useData();
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const idTokenResult = await getIdTokenResult(user);
          const claims = idTokenResult.claims;
          setCurrentUserClaims(claims);
          
          // Route Protection Logic
          if (location.pathname !== '/login') {
             // Super Admin Logic
             if (claims.roles?.globalRole === 'super_admin') {
                if (location.pathname === '/' || location.pathname === '/login') {
                    navigate('/super-admin');
                }
             } 
             // Company Admin/User Logic
             else if (!currentCompanyProfile) {
                 setShowCompanyChooser(true);
             }
          }
        } catch (e) {
          console.error("Error getting claims:", e);
        }
      } else {
        // Not logged in
        setCurrentUser(null);
        setCurrentUserClaims(null);
        if (location.pathname !== '/login') {
            navigate('/login');
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [location.pathname]);

  return <>{children}</>;
}