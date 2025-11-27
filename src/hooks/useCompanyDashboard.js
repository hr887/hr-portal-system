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
  
  // --- NEW: Filters State ---
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
         if(k === 'name') return `${obj['firstName']||''} ${obj['lastName']||''}`.toLowerCase();
         if(k === 'submittedAt') return obj.submittedAt?.seconds || obj.createdAt?.seconds || 0;
         return (obj[k] || '').toString().toLowerCase();
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
    const term = searchQuery.toLowerCase();
    let filtered = currentList.filter(item => {
      const name = `${item['firstName'] || ''} ${item['lastName'] || ''}`.toLowerCase();
      const phone = item.phone?.toLowerCase() || '';
      const email = item.email?.toLowerCase() || '';
      return name.includes(term) || phone.includes(term) || email.includes(term);
    });

    // 2. Advanced Filters
    if (filters.state) {
        filtered = filtered.filter(item => item.state?.toLowerCase() === filters.state.toLowerCase());
    }
    if (filters.driverType) {
        filtered = filtered.filter(item => {
            // Check 'driverType' (Leads) or 'positionApplyingTo' (Apps)
            const type = item.driverType || item.positionApplyingTo || '';
            return type.toLowerCase().includes(filters.driverType.toLowerCase());
        });
    }
    if (filters.dob) {
        filtered = filtered.filter(item => item.dob === filters.dob);
    }
    if (filters.assignee) {
        filtered = filtered.filter(item => item.assignedToName?.toLowerCase().includes(filters.assignee.toLowerCase()));
    }

    return sortList(filtered);
  }, [searchQuery, currentList, sortConfig, filters]); // Added filters dependency

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