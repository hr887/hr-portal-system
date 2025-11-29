// src/hooks/useSuperAdminData.js
import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, collectionGroup, query, orderBy, limit } from 'firebase/firestore';
import { loadCompanies, loadAllUsers, loadAllMemberships } from '../firebase/firestore';

export function useSuperAdminData() {
  // Data State
  const [companyList, setCompanyList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [allCompaniesMap, setAllCompaniesMap] = useState(new Map());

  // Loading & Error State
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState({
    companies: false,
    users: false,
    apps: false,
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  const loadAllData = async () => {
    setLoading(true);
    setStatsError({ companies: false, users: false, apps: false });

    // --- 1. PREPARE PROMISES ---
    
    // Promise A: Companies
    const fetchCompanies = async () => {
        try {
            const companies = [];
            const compMap = new Map();
            compMap.set('general-leads', 'SafeHaul Pool (Unassigned)');
            
            // Limit companies to prevent dropdown explosion if you have thousands
            // For a super admin list, we might want more, but let's cap at 500 for safety
            const compQuery = query(collection(db, "companies"), limit(500));
            const companiesSnap = await getDocs(compQuery);
            
            companiesSnap.forEach((doc) => {
                companies.push({ id: doc.id, ...doc.data() });
                compMap.set(doc.id, doc.data().companyName);
            });
            return { companies, compMap };
        } catch (e) {
            console.error("Error loading companies:", e);
            setStatsError(prev => ({ ...prev, companies: true }));
            return { companies: [], compMap: new Map() };
        }
    };

    // Promise B: Users & Memberships
    const fetchUsers = async () => {
        try {
            // Limit users fetch as well
            const userQuery = query(collection(db, "users"), limit(500));
            
            const [usersSnap, membershipsSnap] = await Promise.all([
                getDocs(userQuery),
                loadAllMemberships(), // Memberships are lightweight, loading all is usually ok, or limit if needed
            ]);

            const membershipsMap = new Map();
            membershipsSnap.forEach((doc) => {
                const membership = doc.data();
                if (!membershipsMap.has(membership.userId)) {
                    membershipsMap.set(membership.userId, []);
                }
                membershipsMap.get(membership.userId).push(membership);
            });

            const users = usersSnap.docs.map((userDoc) => ({
                id: userDoc.id,
                ...userDoc.data(),
                memberships: membershipsMap.get(userDoc.id) || [],
            }));
            return users;
        } catch (e) {
            console.error("Error loading users:", e);
            setStatsError(prev => ({ ...prev, users: true }));
            return [];
        }
    };

    // Promise C: Applications & Leads (SCALABILITY FIX: Added Limits)
    const fetchApps = async () => {
        try {
            const LIMIT_COUNT = 100; // Hard limit to prevent browser crash

            // C1. Branded Apps (Nested)
            const appQuery = query(
                collectionGroup(db, 'applications'), 
                orderBy('createdAt', 'desc'), 
                limit(LIMIT_COUNT)
            );
            
            // C2. General Leads (Root)
            const leadsQuery = query(
                collection(db, 'leads'), 
                orderBy('createdAt', 'desc'), 
                limit(LIMIT_COUNT)
            );

            // C3. Bulk Drivers (Drivers collection)
            const driversQuery = query(
                collection(db, 'drivers'), 
                orderBy('createdAt', 'desc'), 
                limit(LIMIT_COUNT)
            );

            const [appSnap, leadSnap, bulkSnap] = await Promise.all([
                getDocs(appQuery),
                getDocs(leadsQuery),
                getDocs(driversQuery)
            ]);

            // Process C1
            const brandedApps = appSnap.docs.map((doc) => {
                const data = doc.data();
                const parent = doc.ref.parent.parent;
                const companyId = parent ? parent.id : data.companyId;
                return {
                    id: doc.id,
                    ...data,
                    companyId: companyId,
                    sourceType: 'Company App',
                };
            });

            // Process C2
            const generalLeads = leadSnap.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    companyId: 'general-leads',
                    status: data.status || 'New Lead',
                    sourceType: 'General Lead',
                };
            });

            // Process C3
            const bulkLeads = bulkSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(d => d.driverProfile?.isBulkUpload)
                .map(d => ({
                    id: d.id,
                    ...d.personalInfo,
                    companyId: 'general-leads',
                    status: 'Bulk Lead',
                    sourceType: 'Added by Safehaul',
                    createdAt: d.createdAt
                }));

            // Combine
            const combined = [...brandedApps, ...generalLeads, ...bulkLeads];
            
            // Client-side sort of the combined limited lists
            combined.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            return combined;

        } catch (e) {
            console.error("Error loading apps:", e);
            setStatsError(prev => ({ ...prev, apps: true }));
            return [];
        }
    };

    // --- 2. EXECUTE PARALLEL FETCH ---
    const [compResult, usersResult, appsResult] = await Promise.all([
        fetchCompanies(),
        fetchUsers(),
        fetchApps()
    ]);

    // --- 3. SET STATE ---
    setCompanyList(compResult.companies);
    setAllCompaniesMap(compResult.compMap);
    setUserList(usersResult);
    setAllApplications(appsResult);

    setLoading(false);
  };

  // Initial Load
  useEffect(() => {
    loadAllData();
  }, []);

  // Search Logic (Memoized)
  const searchResults = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return { companies: [], users: [], applications: [] };

    const matchedCompanies = companyList.filter(c => 
        c.companyName?.toLowerCase().includes(term) || 
        c.appSlug?.toLowerCase().includes(term)
    );

    const matchedUsers = userList.filter(u => 
        u.name?.toLowerCase().includes(term) || 
        u.email?.toLowerCase().includes(term)
    );

    const matchedApps = allApplications.filter(a => {
        const name = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
        const email = (a.email || '').toLowerCase();
        const cdl = (a.cdlNumber || '').toLowerCase();
        return name.includes(term) || email.includes(term) || cdl.includes(term);
    });

    return { companies: matchedCompanies, users: matchedUsers, applications: matchedApps };
  }, [searchQuery, companyList, userList, allApplications]);

  const stats = {
      companyCount: companyList.length,
      userCount: userList.length,
      appCount: allApplications.length
  };

  const totalSearchResults = searchResults.companies.length + searchResults.users.length + searchResults.applications.length;

  return {
    // Data
    companyList,
    userList,
    allApplications,
    allCompaniesMap,
    stats,
    
    // State
    loading,
    statsError,
    searchQuery,
    setSearchQuery,
    
    // Search Results
    searchResults,
    totalSearchResults,
    
    // Actions
    refreshData: loadAllData
  };
}