// hr portal/src/components/company/DashboardToolbar.jsx

import React, { useState, useMemo } from 'react';
import { Search, Filter, X, Zap, Briefcase } from 'lucide-react';

// --- CONFIGURATION (Move from original DashboardTable) ---
const DRIVER_TYPE_OPTIONS = [
    "Dry Van", "Reefer", "Flatbed", "Tanker", "Box Truck", 
    "Car Hauler", "Step Deck", "Lowboy", "Conestoga", 
    "Intermodal", "Power Only", "Hotshot"
];

// --- COMPONENT ---

/**
 * Renders the toolbar, search bar, filter toggle, and the expandable filter panel.
 */
export function DashboardToolbar({
    activeTab, 
    dataCount, 
    totalCount,
    searchQuery, 
    setSearchQuery,
    filters, 
    setFilters,
    clearFilters
}) {
  const [showFilters, setShowFilters] = useState(false);

  // Helper: Dynamic Tab Title
  const getTabTitle = () => {
    switch (activeTab) {
        case 'applications': return 'Direct Applications';
        case 'find_driver': return 'SafeHaul Network Leads';
        case 'company_leads': return 'Imported Company Leads';
        case 'my_leads': return 'My Assigned Drivers';
        default: return 'Drivers';
    }
  };
  
  // Helper: Handle Filter Updates
  const handleFilterChange = (key, value) => {
      // setFilters is a wrapper from parent that handles page reset
      setFilters(key, value);
  };

  const hasActiveFilters = useMemo(() => {
    return filters && (filters.state || filters.driverType || filters.dob || filters.assignee);
  }, [filters]);


  return (
    <div className="p-4 border-b border-gray-200 bg-white z-10 flex flex-col gap-3 shrink-0">
      
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {activeTab === 'find_driver' && <Zap size={18} className="text-purple-600 fill-purple-100"/>}
                {activeTab === 'company_leads' && <Briefcase size={18} className="text-orange-600"/>}
                {getTabTitle()}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
                Showing {dataCount} of {totalCount} records
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search name, phone, email..." 
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
              
              {/* Filter Toggle Button */}
              <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg border transition-all flex items-center gap-2 text-sm font-medium ${
                      showFilters || hasActiveFilters 
                      ? 'bg-blue-50 border-blue-200 text-blue-700' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                  <Filter size={16} />
                  <span className="hidden sm:inline">Filters</span>
                  {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
              </button>
          </div>
      </div>

      {/* --- Filter Panel (Collapsible) --- */}
      {showFilters && (
          <div className="pt-3 pb-1 border-t border-dashed border-gray-200 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  
                  {/* Filter: Driver Type */}
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Freight Type</label>
                      <select 
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          value={filters?.driverType || ''}
                          onChange={(e) => handleFilterChange('driverType', e.target.value)}
                      >
                          <option value="">All Types</option>
                          {DRIVER_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>

                  {/* Filter: State */}
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">State</label>
                      <input 
                          type="text" 
                          placeholder="e.g. IL, TX"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          value={filters?.state || ''}
                          onChange={(e) => handleFilterChange('state', e.target.value)}
                          maxLength={2}
                      />
                  </div>

                  {/* Filter: Assignee */}
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assigned To</label>
                      <input 
                          type="text" 
                          placeholder="Search recruiter..."
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          value={filters?.assignee || ''}
                          onChange={(e) => handleFilterChange('assignee', e.target.value)}
                      />
                  </div>

                  {/* Clear Button */}
                  <div className="flex items-end">
                      <button 
                          onClick={clearFilters} 
                          className="w-full p-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                          <X size={14} /> Clear Filters
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}