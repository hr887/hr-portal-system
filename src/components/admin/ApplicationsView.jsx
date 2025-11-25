// src/components/admin/ApplicationsView.jsx
import React, { useState, useMemo } from 'react';
import { getFieldValue, getStatusColor } from '../../utils/helpers.js';
import { FileText, Search, ArrowDownUp, Filter, Zap } from 'lucide-react';

// --- Reusable Card Component ---
function Card({ title, icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-5 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-3">
          {icon}
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

// --- Helper function for sorting ---
const sortApplications = (apps, config) => {
  const { key, direction } = config;
  
  return [...apps].sort((a, b) => {
    let aVal, bVal;
    
    switch(key) {
      case 'name':
        aVal = `${a['firstName'] || ''} ${a['lastName'] || ''}`.toLowerCase().trim();
        bVal = `${b['firstName'] || ''} ${b['lastName'] || ''}`.toLowerCase().trim();
        break;
      case 'company':
        aVal = a.companyName?.toLowerCase() || '';
        bVal = b.companyName?.toLowerCase() || '';
        break;
      case 'state':
        aVal = a['state'] || '';
        bVal = b['state'] || '';
        break;
      case 'submittedAt':
      default:
        aVal = a.submittedAt?.seconds || a.createdAt?.seconds || 0;
        bVal = b.submittedAt?.seconds || b.createdAt?.seconds || 0;
        break;
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export function ApplicationsView({ 
  listLoading, 
  statsError, 
  allApplications, 
  allCompaniesMap,
  onAppClick 
}) {
  const [appSearch, setAppSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'submittedAt', direction: 'desc' });
  const [filterSource, setFilterSource] = useState('All'); // 'All', 'Company App', 'Added by Safehaul'

  const filteredApplications = useMemo(() => {
    const searchTerm = appSearch.toLowerCase();
    
    // Map applications
    const appsWithData = allApplications.map(app => ({
      ...app,
      companyName: allCompaniesMap.get(app.companyId) || (app.companyId === 'general-leads' ? 'General Pool' : 'Unknown')
    }));
    
    // Filter logic
    const filtered = appsWithData.filter(app => {
      // 1. Text Search
      const name = `${app['firstName'] || ''} ${app['lastName'] || ''}`.toLowerCase();
      const companyName = app.companyName.toLowerCase();
      const matchesText = (name.includes(searchTerm) ||
              app.email?.toLowerCase().includes(searchTerm) ||
              companyName.includes(searchTerm));

      // 2. Tab Filter
      let matchesTab = true;
      if (filterSource === 'Added by Safehaul') {
          matchesTab = app.sourceType === 'Added by Safehaul';
      } else if (filterSource === 'Company App') {
          matchesTab = app.sourceType !== 'Added by Safehaul' && app.sourceType !== 'General Lead';
      }

      return matchesText && matchesTab;
    });
    
    // Sort logic
    return sortApplications(filtered, sortConfig);
    
  }, [appSearch, allApplications, allCompaniesMap, sortConfig, filterSource]);
  
  const handleSortChange = (e) => {
    const [key, direction] = e.target.value.split(',');
    setSortConfig({ key, direction });
  };

  return (
    <Card title="Driver Applications" icon={<FileText size={22} />} className="w-full">
      {/* --- Filters Row --- */}
      <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex gap-2">
          <button 
            onClick={() => setFilterSource('All')} 
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterSource === 'All' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
          >
            All Drivers
          </button>
          <button 
            onClick={() => setFilterSource('Company App')} 
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterSource === 'Company App' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
          >
            Direct Applications
          </button>
          <button 
            onClick={() => setFilterSource('Added by Safehaul')} 
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${filterSource === 'Added by Safehaul' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
          >
            <Zap size={12} /> Added by Safehaul
          </button>
      </div>

      <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Search by driver name, email, or company name..."
            className="w-full p-3 pl-10 border border-gray-300 rounded-lg"
            value={appSearch}
            onChange={(e) => setAppSearch(e.target.value)}
          />
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        
        <div className="relative w-full sm:w-auto">
          <select
            id="sort-select-super"
            className="w-full sm:w-auto px-4 py-3 pl-10 border border-gray-300 rounded-lg shadow-sm text-gray-700 font-semibold bg-white appearance-none"
            onChange={handleSortChange}
            value={`${sortConfig.key},${sortConfig.direction}`}
          >
            <option value="submittedAt,desc">Newest First</option>
            <option value="submittedAt,asc">Oldest First</option>
            <option value="name,asc">Driver Name (A-Z)</option>
            <option value="name,desc">Driver Name (Z-A)</option>
            <option value="company,asc">Company Name (A-Z)</option>
            <option value="company,desc">Company Name (Z-A)</option>
          </select>
          <ArrowDownUp size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      
      <div id="application-list" className="p-5 space-y-4">
        {listLoading ? <p>Loading applications...</p> : (
          statsError.apps ? <p className="text-red-600">Error: Could not load applications. Check permissions.</p> :
          filteredApplications.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              {appSearch ? 'No applications found matching your search.' : 'No applications found.'}
            </p>
          ) :
          filteredApplications.map(app => (
            <button 
              key={app.id} 
              className="w-full p-4 border border-gray-200 rounded-lg bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between text-left hover:border-blue-500 hover:shadow-md transition-all"
              onClick={() => onAppClick(app)}
            >
              <div>
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-gray-900">{`${getFieldValue(app['firstName'])} ${getFieldValue(app['lastName'])}`}</h3>
                    {app.sourceType === 'Added by Safehaul' && <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200">SAFEHAUL</span>}
                </div>
                <p className="text-sm text-gray-600">{getFieldValue(app.email)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  From: <span className="font-medium text-gray-700">{app.companyName}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`mt-2 sm:mt-0 px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(app.status || 'New Application')}`}>
                    {app.status || 'New Application'}
                </span>
                <span className="text-xs text-gray-400">
                     {app.createdAt ? new Date(app.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}