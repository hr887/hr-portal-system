// src/hooks/useCompanyDashboard.js
import { useState, useEffect, useMemo } from 'react';
import { loadApplications, loadCompanyLeads } from '../firebase/firestore';
import { auth } from '../firebase/config';

export function useCompanyDashboard(companyId) {
  const [applications, setApplications] = useState([]);
  const [platformLeads, setPlatformLeads] = useState([]);
  const [companyLeads, setCompanyLeads] = useState([]);
  const [myLeads, setMyLeads] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('applications');
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- Filters State ---
  const [filters, setFilters] = useState({
      state: '',
      driverType: '',
      dob: '',
      assignee: ''
  });

  const [sortConfig, setSortConfig] = useState({ key: 'submittedAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const refreshData = async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const [appList, allLeads] = await Promise.all([
          loadApplications(companyId),
          loadCompanyLeads(companyId)
      ]);
      setApplications(appList);

      // 1. Platform Leads (SafeHaul Network)
      const pLeads = allLeads.filter(l => l.isPlatformLead === true);
      setPlatformLeads(pLeads);

      // 2. Company Leads (Uploaded by Company)
      const cLeads = allLeads.filter(l => l.isPlatformLead === false);
      setCompanyLeads(cLeads);

      // 3. My Leads (Assigned to ME)
      const currentUid = auth.currentUser?.uid;
      if (currentUid) {
          const myL = allLeads.filter(l => l.assignedTo === currentUid);
          setMyLeads(myL);
      } else {
          setMyLeads([]);
      }

    } catch (err) {
      console.error("Error loading data: ", err);
      setError("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [companyId]);

  const currentList = useMemo(() => {
      switch(activeTab) {
          case 'applications': return applications;
          case 'find_driver': return platformLeads;
          case 'company_leads': return companyLeads; 
          case 'my_leads': return myLeads;
          default: return applications;
      }
  }, [activeTab, applications, platformLeads, companyLeads, myLeads]);

  const sortList = (list) => {
    const { key, direction } = sortConfig;
    return [...list].sort((a, b) => {
      const getString = (obj, k) => {
         // Helper to safely get nested values for sorting
         const val = obj[k] || obj?.personalInfo?.[k] || '';
         if(k === 'name') {
             const f = obj['firstName'] || obj?.personalInfo?.firstName || '';
             const l = obj['lastName'] || obj?.personalInfo?.lastName || '';
             return `${f} ${l}`.toLowerCase();
         }
         if(k === 'submittedAt') return obj.submittedAt?.seconds || obj.createdAt?.seconds || 0;
         
         return (val).toString().toLowerCase();
      };
      
      const aVal = getString(a, key);
      const bVal = getString(b, key);
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredList = useMemo(() => {
    // 1. Text Search
    const term = searchQuery.toLowerCase().trim();
    
    let filtered = currentList.filter(item => {
      if (!item) return false;
      // Safe Accessors with Default Values
      const fName = (item.firstName || item.personalInfo?.firstName || '').toLowerCase();
      const lName = (item.lastName || item.personalInfo?.lastName || '').toLowerCase();
      const phone = (item.phone || item.personalInfo?.phone || '').toLowerCase();
      const email = (item.email || item.personalInfo?.email || '').toLowerCase();
      const fullName = `${fName} ${lName}`;

      return fullName.includes(term) || phone.includes(term) || email.includes(term);
    });

    // 2. Advanced Filters
    // STATE FILTER
    if (filters.state) {
         const stateSearch = filters.state.toLowerCase().trim();
         filtered = filtered.filter(item => {
             const val = item.state || item.personalInfo?.state || '';
             return val.toLowerCase().includes(stateSearch);
         });
    }
    
    // DRIVER TYPE FILTER
    if (filters.driverType) {
        const typeSearch = filters.driverType.toLowerCase().trim();
        filtered = filtered.filter(item => {
            // Check root 'driverType', nested 'driverProfile.type', or 'positionApplyingTo'
            const typeA = item.driverType;
            const typeB = item.driverProfile?.type;
            const typeC = item.positionApplyingTo;
            
            // Helper to check a value safely
            const check = (val) => {
                if (!val) return false;
                if (Array.isArray(val)) {
                    return val.some(v => String(v).toLowerCase().includes(typeSearch));
                }
                return String(val).toLowerCase().includes(typeSearch);
            };

            return check(typeA) || check(typeB) || check(typeC);
        });
    }
    
    // DOB FILTER
    if (filters.dob) {
        filtered = filtered.filter(item => {
            const val = item.dob || item.personalInfo?.dob || '';
            return val === filters.dob;
        });
    }

    // ASSIGNEE FILTER
    if (filters.assignee) {
        const assigneeSearch = filters.assignee.toLowerCase().trim();
        filtered = filtered.filter(item => {
            // Safe access to assignedToName, defaulting to '' to prevent crashes
            const assignee = (item.assignedToName || 'unassigned').toLowerCase();
            return assignee.includes(assigneeSearch);
        });
    }

    return sortList(filtered);
  }, [searchQuery, currentList, sortConfig, filters]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;

  const paginatedData = useMemo(() => {
      const start = (currentPage - 1) * itemsPerPage;
      return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [activeTab, searchQuery, itemsPerPage, filters]);

  return {
    applications,
    platformLeads,
    companyLeads,
    myLeads,
    paginatedData,
    filteredList,
    loading,
    error,
    refreshData,
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    sortConfig, setSortConfig,
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage,
    totalPages,
    // Export Filters
    filters, setFilters
  };
}