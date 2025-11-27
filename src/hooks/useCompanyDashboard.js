// src/hooks/useCompanyDashboard.js
import { useState, useEffect, useMemo } from 'react';
import { loadApplications, loadCompanyLeads } from '../firebase/firestore';

export function useCompanyDashboard(companyId) {
  // Data State
  const [applications, setApplications] = useState([]);
  const [platformLeads, setPlatformLeads] = useState([]);
  const [companyLeads, setCompanyLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View State
  const [activeTab, setActiveTab] = useState('applications');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'submittedAt', direction: 'desc' });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // --- 1. Data Fetching ---
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

      // Split leads based on source
      const cLeads = allLeads.filter(l => l.source === 'Company Import');
      const pLeads = allLeads.filter(l => l.source !== 'Company Import');

      setPlatformLeads(pLeads);
      setCompanyLeads(cLeads);
    } catch (err) {
      console.error("Error loading data: ", err);
      setError("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    refreshData();
  }, [companyId]);

  // --- 2. Filtering & Sorting Logic ---
  
  // Determine which list is active
  const currentList = useMemo(() => {
      switch(activeTab) {
          case 'applications': return applications;
          case 'find_driver': return platformLeads;
          case 'my_leads': return companyLeads;
          default: return applications;
      }
  }, [activeTab, applications, platformLeads, companyLeads]);

  // Helper: Sort Function
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

  // Apply Search & Sort
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

  // --- 3. Pagination Logic ---
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  
  const paginatedData = useMemo(() => {
      const start = (currentPage - 1) * itemsPerPage;
      return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  // Reset page on filter change
  useEffect(() => {
      setCurrentPage(1);
  }, [activeTab, searchQuery, itemsPerPage]);

  return {
    // Data
    applications,
    platformLeads,
    companyLeads,
    paginatedData,
    filteredList, // For count
    loading,
    error,
    
    // Actions
    refreshData,
    
    // State Getters/Setters
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    sortConfig, setSortConfig,
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage,
    totalPages
  };
}