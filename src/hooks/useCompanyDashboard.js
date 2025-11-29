// src/hooks/useCompanyDashboard.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    collection, 
    query, 
    orderBy, 
    limit, 
    startAfter, 
    getDocs, 
    where, 
    getCountFromServer 
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export function useCompanyDashboard(companyId) {
  // --- Data State ---
  const [data, setData] = useState([]);
  const [lastDoc, setLastDoc] = useState(null); // Cursor for pagination
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Stats State (for the top cards) ---
  const [stats, setStats] = useState({
      applications: 0,
      platformLeads: 0,
      companyLeads: 0,
      myLeads: 0
  });

  // --- UI State ---
  const [activeTab, setActiveTab] = useState('applications');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
      state: '',
      driverType: '',
      dob: '',
      assignee: ''
  });

  // Sorting & Pagination Config
  const [sortConfig, setSortConfig] = useState({ key: 'submittedAt', direction: 'desc' });
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  // --- 1. Fetch Total Counts (Optimized) ---
  const fetchStats = useCallback(async () => {
      if (!companyId) return;
      try {
          // Applications Count
          const appsRef = collection(db, "companies", companyId, "applications");
          const appsCount = await getCountFromServer(appsRef);

          // Leads Counts
          const leadsRef = collection(db, "companies", companyId, "leads");

          // Platform Leads (Find Driver)
          const qPlatform = query(leadsRef, where("isPlatformLead", "==", true));
          const platformCount = await getCountFromServer(qPlatform);

          // Company Leads
          const qCompany = query(leadsRef, where("isPlatformLead", "==", false));
          const companyCount = await getCountFromServer(qCompany);

          // My Leads
          let myCountVal = 0;
          if (auth.currentUser) {
              const qMy = query(leadsRef, where("assignedTo", "==", auth.currentUser.uid));
              const myCount = await getCountFromServer(qMy);
              myCountVal = myCount.data().count;
          }

          setStats({
              applications: appsCount.data().count,
              platformLeads: platformCount.data().count,
              companyLeads: companyCount.data().count,
              myLeads: myCountVal
          });

      } catch (e) {
          console.error("Error fetching stats:", e);
      }
  }, [companyId]);

  // --- 2. Fetch Data Pages (Server-Side Pagination) ---
  const fetchData = useCallback(async (isNextPage = false) => {
      if (!companyId) return;
      setLoading(true);
      setError('');

      try {
          let baseRef;
          let constraints = [];

          if (activeTab === 'applications') {
              baseRef = collection(db, "companies", companyId, "applications");
              constraints.push(orderBy("submittedAt", "desc"));
          } else {
              baseRef = collection(db, "companies", companyId, "leads");
              constraints.push(orderBy("createdAt", "desc"));
              if (activeTab === 'find_driver') {
                  constraints.push(where("isPlatformLead", "==", true));
              } else if (activeTab === 'company_leads') {
                  constraints.push(where("isPlatformLead", "==", false)); 
              } else if (activeTab === 'my_leads' && auth.currentUser) {
                   constraints.push(where("assignedTo", "==", auth.currentUser.uid));
              }
          }

          constraints.push(limit(itemsPerPage));
          if (isNextPage && lastDoc) {
              constraints.push(startAfter(lastDoc));
          }

          const q = query(baseRef, ...constraints);
          const snapshot = await getDocs(q);

          const newData = snapshot.docs.map(doc => ({
              id: doc.id,
              companyId,
              ...doc.data()
          }));

          if (isNextPage) {
              setData(prev => [...prev, ...newData]);
          } else {
              setData(newData);
          }

          const lastVisible = snapshot.docs[snapshot.docs.length - 1];
          setLastDoc(lastVisible);
          setHasMore(snapshot.docs.length >= itemsPerPage);

      } catch (err) {
          console.error("Dashboard fetch error:", err);
          setError("Failed to load data. Ensure indexes are created in Firebase Console.");
      } finally {
          setLoading(false);
      }
  }, [companyId, activeTab, itemsPerPage, lastDoc]);

  // --- Effects ---

  // Initial Load (Reset on Tab Change)
  useEffect(() => {
      setData([]);
      setLastDoc(null);
      setHasMore(true);
  }, [activeTab, companyId]);

  useEffect(() => {
      fetchData(false);
      fetchStats();
  }, [activeTab, companyId, fetchData, fetchStats]);

  // Filter Logic (Client-Side for the *current page*)
  // Note: True server-side search across fields is not supported natively by Firestore.
  const filteredList = useMemo(() => {
      const term = searchQuery.toLowerCase().trim();

      return data.filter(item => {
          // 1. Text Search
          if (term) {
              const fName = (item.firstName || item.personalInfo?.firstName || '').toLowerCase();
              const lName = (item.lastName || item.personalInfo?.lastName || '').toLowerCase();
              const email = (item.email || item.personalInfo?.email || '').toLowerCase();
              const phone = (item.phone || item.personalInfo?.phone || '').toLowerCase();
              const fullName = `${fName} ${lName}`;

              if (!fullName.includes(term) && !email.includes(term) && !phone.includes(term)) {
                  return false;
              }
          }

          // 2. Advanced Filters (State, Driver Type, etc.)
          if (filters.state) {
             const s = (item.state || item.personalInfo?.state || '').toLowerCase();
             if (!s.includes(filters.state.toLowerCase())) return false;
          }

          // (Add other filters here as needed, mirroring previous logic)
          return true;
      });
  }, [data, searchQuery, filters]);

  // --- API Return ---
  return {
      // Data Arrays (Mapped for compatibility with existing UI)
      applications: activeTab === 'applications' ? filteredList : [],
      platformLeads: activeTab === 'find_driver' ? filteredList : [],
      companyLeads: activeTab === 'company_leads' ? filteredList : [],
      myLeads: activeTab === 'my_leads' ? filteredList : [],

      // Main Data Prop for Table
      paginatedData: filteredList, 

      // Counts for Stat Cards
      counts: stats, // Use this in UI instead of array.length for totals

      loading,
      error,
      refreshData: () => { setData([]); setLastDoc(null); fetchData(false); fetchStats(); },
      loadMore: () => fetchData(true), // Call this when scrolling down
      hasMore,

      activeTab, setActiveTab,
      searchQuery, setSearchQuery,
      sortConfig, setSortConfig,

      // Mock Pagination Props (Since we use Load More now)
      currentPage: 1, setCurrentPage: () => {}, 
      itemsPerPage, setItemsPerPage,
      totalPages: 1, 

      filters, setFilters
  };
}