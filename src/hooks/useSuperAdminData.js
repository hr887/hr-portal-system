// src/hooks/useSuperAdminData.js
import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, collectionGroup } from 'firebase/firestore';
import { loadCompanies, loadAllUsers, loadAllMemberships } from '../firebase/firestore';

export function useSuperAdminData() {
  // Data State
  const [companyList, setCompanyList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [allCompaniesMap, setAllCompaniesMap] = useState(new Map());
  
  // Loading & Error State
  const [loading, setLoading] = useState(true); // Global loading for initial fetch
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

    // We'll run these in parallel but handle errors individually where possible or just try/catch blocks
    // 1. Companies
    let companies = [];
    let compMap = new Map();
    compMap.set('general-leads', 'SafeHaul Pool (Unassigned)');

    try {
        const companiesSnap = await loadCompanies();
        companiesSnap.forEach((doc) => {
            companies.push({ id: doc.id, ...doc.data() });
            compMap.set(doc.id, doc.data().companyName);
        });
        setCompanyList(companies);
        setAllCompaniesMap(compMap);
    } catch (e) {
        console.error("Error loading companies:", e);
        setStatsError(prev => ({ ...prev, companies: true }));
    }

    // 2. Users & Memberships
    try {
        const [usersSnap, membershipsSnap] = await Promise.all([
            loadAllUsers(),
            loadAllMemberships(),
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
        setUserList(users);
    } catch (e) {
        console.error("Error loading users:", e);
        setStatsError(prev => ({ ...prev, users: true }));
    }

    // 3. Applications & Leads
    try {
        // A. Branded Apps
        const appSnap = await getDocs(collectionGroup(db, 'applications'));
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

        // B. General Leads
        const leadSnap = await getDocs(collection(db, 'leads'));
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

        // C. Bulk Leads
        const bulkSnap = await getDocs(collection(db, 'drivers'));
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

        const combined = [...brandedApps, ...generalLeads, ...bulkLeads];
        // Sort newest first
        combined.sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
        });

        setAllApplications(combined);
    } catch (e) {
        console.error("Error loading apps:", e);
        setStatsError(prev => ({ ...prev, apps: true }));
    }

    setLoading(false);
  };

  // Initial Load
  useEffect(() => {
    loadAllData();
  }, []);

  // Search Logic
  const searchResults = useMemo(() => {
    const term = searchQuery.toLowerCase();
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
        const email = a.email?.toLowerCase() || '';
        const cdl = a.cdlNumber?.toLowerCase() || '';
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