// src/components/admin/ApplicationsView.jsx
import React, { useState, useMemo } from 'react';
import { getFieldValue, getStatusColor } from '../../utils/helpers.js';
import { FileText, Search, ArrowDownUp } from 'lucide-react'; // <-- Added ArrowDownUp

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
// ---

// --- NEW: Helper function for sorting ---
const sortApplications = (apps, config) => {
  const { key, direction } = config;
  
  return [...apps].sort((a, b) => {
    let aVal, bVal;
    
    // Get values based on sort key
    switch(key) {
      case 'name':
        aVal = `${a['firstName'] || ''} ${a['lastName'] || ''}`.toLowerCase().trim();
        bVal = `${b['firstName'] || ''} ${b['lastName'] || ''}`.toLowerCase().trim();
        break;
      case 'company':
        aVal = a.companyName?.toLowerCase() || ''; // We'll add companyName in the memo
        bVal = b.companyName?.toLowerCase() || '';
        break;
      case 'state':
        aVal = a['state'] || '';
        bVal = b['state'] || '';
        break;
      case 'submittedAt':
      default:
        // Use the Firestore timestamp for accurate date sorting
        aVal = a.submittedAt?.seconds || 0;
        bVal = b.submittedAt?.seconds || 0;
        break;
    }

    // Compare values
    if (aVal < bVal) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aVal > bVal) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};
// --- End Helper ---

export function ApplicationsView({ 
  listLoading, 
  statsError, 
  allApplications, 
  allCompaniesMap,
  onAppClick 
}) {
  const [appSearch, setAppSearch] = useState('');
  // --- NEW: State for sorting ---
  const [sortConfig, setSortConfig] = useState({ key: 'submittedAt', direction: 'desc' });

  const filteredApplications = useMemo(() => {
    const searchTerm = appSearch.toLowerCase();
    
    // First, map applications to include companyName for searching/sorting
    const appsWithData = allApplications.map(app => ({
      ...app,
      companyName: allCompaniesMap.get(app.companyId) || 'Unknown Company'
    }));
    
    // Filter logic
    const filtered = appsWithData.filter(app => {
      const name = `${app['firstName'] || ''} ${app['lastName'] || ''}`.toLowerCase();
      const companyName = app.companyName.toLowerCase();
      return (name.includes(searchTerm) ||
              app.email?.toLowerCase().includes(searchTerm) ||
              companyName.includes(searchTerm));
    });
    
    // Sort logic
    return sortApplications(filtered, sortConfig);
    
  }, [appSearch, allApplications, allCompaniesMap, sortConfig]);
  
  // --- NEW: Handler for sorting ---
  const handleSortChange = (e) => {
    const [key, direction] = e.target.value.split(',');
    setSortConfig({ key, direction });
  };

  return (
    <Card title="All Driver Applications" icon={<FileText size={22} />} className="w-full">
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
        
        {/* --- NEW: Sort Dropdown --- */}
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
            <option value="state,asc">State (A-Z)</option>
            <option value="state,desc">State (Z-A)</option>
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
              onClick={() => onAppClick(app.companyId, app.id)}
            >
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{`${getFieldValue(app['firstName'])} ${getFieldValue(app['lastName'])}`}</h3>
                <p className="text-sm text-gray-600">{getFieldValue(app.email)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  From: <span className="font-medium text-gray-700">{app.companyName}</span>
                </p>
              </div>
              <span className={`mt-2 sm:mt-0 px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(app.status || 'New Application')}`}>
                {app.status || 'New Application'}
              </span>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}