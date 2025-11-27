// src/hooks/useCompanyDashboard.js
import { useState, useEffect, useMemo } from 'react';
import { loadApplications, loadCompanyLeads } from '../firebase/firestore';
import { auth } from '../firebase/config';

export function useCompanyDashboard(companyId) {
  const [applications, setApplications] = useState([]);
  const [platformLeads, setPlatformLeads] = useState([]);
  const [companyLeads, setCompanyLeads] = useState([]);
  const [myLeads, setMyLeads] = useState([]); // <-- NEW State
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('applications');
  const [searchQuery, setSearchQuery] = useState('');
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
      // source is NOT 'Company Import'
      const pLeads = allLeads.filter(l => l.source !== 'Company Import');
      setPlatformLeads(pLeads);

      // 2. Company Leads (All uploaded by this company)
      // source IS 'Company Import'
      const cLeads = allLeads.filter(l => l.source === 'Company Import');
      setCompanyLeads(cLeads);

      // 3. My Leads (Assigned to ME)
      // Check assignedTo field against current user UID
      const currentUid = auth.currentUser?.uid;
      if (currentUid) {
          // Filter from ALL leads (both platform and company imports can be assigned)
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
          case 'company_leads': return companyLeads; // <-- NEW Tab
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
    const term = searchQuery.toLowerCase();
    const filtered = currentList.filter(item => {
      const name = `${item['firstName'] || ''} ${item['lastName'] || ''}`.toLowerCase();
      const phone = item.phone?.toLowerCase() || '';
      const email = item.email?.toLowerCase() || '';
      return name.includes(term) || phone.includes(term) || email.includes(term);
    });
    return sortList(filtered);
  }, [searchQuery, currentList, sortConfig]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
      const start = (currentPage - 1) * itemsPerPage;
      return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [activeTab, searchQuery, itemsPerPage]);

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
    totalPages
  };
}