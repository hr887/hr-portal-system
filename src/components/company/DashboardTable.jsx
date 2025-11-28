// src/components/company/DashboardTable.jsx
import React, { useState } from 'react';
import { Search, Phone, ChevronLeft, ChevronRight, Filter, X, MapPin, Truck, Calendar, User, Clock } from 'lucide-react';
import { getFieldValue, formatPhoneNumber } from '../../utils/helpers';

const DRIVER_TYPES = [
    "Dry Van", "Reefer", "Flatbed", "Box Truck", "Tanker", "Team"
];

const US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

// --- Helper for Status Colors ---
const getStatusBadgeStyles = (status) => {
    const s = (status || '').toLowerCase();
    
    if (s.includes('approved') || s.includes('hired') || s.includes('accepted')) {
        return 'bg-green-100 text-green-800 border-green-200';
    }
    if (s.includes('rejected') || s.includes('disqualified') || s.includes('declined')) {
        return 'bg-red-100 text-red-800 border-red-200';
    }
    if (s.includes('contacted') || s.includes('attempted') || s.includes('awaiting')) {
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    if (s.includes('offer')) {
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    // Default / New / In Review
    return 'bg-blue-50 text-blue-700 border-blue-200';
};

export function DashboardTable({
  // Data & State
  activeTab,
  loading,
  data, 
  totalCount, 
  selectedId,
  
  // Actions
  onSelect,
  onPhoneClick,
  
  // Search
  searchQuery,
  setSearchQuery,
  
  // Filters
  filters,
  setFilters,
  
  // Pagination
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  totalPages
}) {
  const [showFilters, setShowFilters] = useState(false);

  const getTabTitle = () => {
    if (activeTab === 'applications') return 'Direct Applications';
    if (activeTab === 'find_driver') return 'SafeHaul Network Leads';
    if (activeTab === 'company_leads') return 'Company Imported Leads';
    if (activeTab === 'my_leads') return 'My Assigned Leads';
    return 'Drivers';
  };

  const handleFilterChange = (key, value) => {
      setFilters(prev => ({ ...prev, [key]: value }));
      setCurrentPage(1);
  };

  const clearFilters = () => {
      setFilters({ state: '', driverType: '', dob: '', assignee: '' });
      setSearchQuery('');
      setCurrentPage(1);
  };

  const hasActiveFilters = filters && (filters.state || filters.driverType || filters.dob || filters.assignee);

  return (
    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
      
      {/* --- Toolbar --- */}
      <div className="p-4 border-b border-gray-200 bg-white z-10 flex flex-col gap-3">
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{getTabTitle()}</h2>
              <p className="text-xs text-gray-500">Showing {data.length} of {totalCount} records</p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search name, phone, email..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                  />
                </div>
                
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-lg border transition-all flex items-center gap-2 text-sm font-medium ${showFilters || hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                    <Filter size={16} />
                    <span className="hidden sm:inline">Filters</span>
                    {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                </button>
            </div>
        </div>

        {/* --- Filter Panel --- */}
        {showFilters && (
            <div className="pt-3 pb-1 border-t border-dashed border-gray-200 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    
                    {/* Filter: Driver Type */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                        <div className="relative">
                            <Truck size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                            <select 
                                className="w-full pl-8 p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                value={filters?.driverType || ''}
                                onChange={(e) => handleFilterChange('driverType', e.target.value)}
                            >
                                <option value="">All Types</option>
                                {DRIVER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Filter: State */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">State</label>
                        <div className="relative">
                            <MapPin size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                            <select 
                                className="w-full pl-8 p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                value={filters?.state || ''}
                                onChange={(e) => handleFilterChange('state', e.target.value)}
                            >
                                <option value="">All States</option>
                                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Filter: DOB */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date of Birth</label>
                        <div className="relative">
                            <Calendar size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                            <input 
                                type="date"
                                className="w-full pl-8 p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={filters?.dob || ''}
                                onChange={(e) => handleFilterChange('dob', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filter: Assignee */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assignee</label>
                        <div className="relative">
                            <User size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search recruiter..."
                                className="w-full pl-8 p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={filters?.assignee || ''}
                                onChange={(e) => handleFilterChange('assignee', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Clear Button */}
                    <div className="flex items-end">
                        <button 
                            onClick={clearFilters}
                            className="w-full p-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-2 transition-colors"
                        >
                            <X size={14} /> Clear
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* --- Table --- */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Name / Contact</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Status</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Details</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Assignee</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
               // --- SKELETON LOADER ---
               Array.from({ length: 5 }).map((_, i) => (
                 <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0"></div>
                            <div className="space-y-2 w-full">
                                <div className="h-3 w-24 bg-gray-200 rounded"></div>
                                <div className="h-2 w-16 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="space-y-2">
                            <div className="h-3 w-28 bg-gray-200 rounded"></div>
                            <div className="h-2 w-20 bg-gray-200 rounded"></div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="h-3 w-16 bg-gray-200 rounded ml-auto"></div>
                    </td>
                 </tr>
               ))
            ) : totalCount === 0 ? (
              <tr><td colSpan="5" className="p-10 text-center text-gray-400">No drivers found.</td></tr>
            ) : (
              data.map(item => {
                const name = `${getFieldValue(item['firstName'])} ${getFieldValue(item['lastName'])}`;
                const isSelected = selectedId === item.id;
                
                return (
                  <tr 
                    key={item.id} 
                    onClick={() => onSelect(item)} 
                    className={`cursor-pointer transition-colors group ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
                  >
                    {/* Name & Phone */}
                    <td className="px-6 py-3.5 align-middle">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${isSelected ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200 group-hover:bg-white'}`}>
                                {name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">{name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <button 
                                        onClick={(e) => onPhoneClick(e, item)}
                                        className="text-xs text-gray-500 hover:text-blue-600 hover:underline flex items-center gap-1 transition-colors"
                                    >
                                        <Phone size={10} /> {formatPhoneNumber(getFieldValue(item.phone))}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-3.5 align-middle">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusBadgeStyles(item.status)}`}>
                        {item.status || 'New'}
                      </span>
                    </td>

                    {/* Details (Type/Exp/State) */}
                    <td className="px-6 py-3.5 align-middle">
                       <div className="flex flex-col gap-1">
                           <span className="text-xs font-medium text-gray-700">
                                {item.driverType || item.positionApplyingTo || 'Unspecified'}
                           </span>
                           <span className="text-[10px] text-gray-500 flex items-center gap-2">
                               {item.experience || item['experience-years'] || 'N/A Exp'} 
                               {item.state && <span>• {item.state}</span>}
                           </span>
                       </div>
                    </td>

                    {/* Assignee */}
                    <td className="px-6 py-3.5 align-middle">
                        {item.assignedToName ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200 w-fit">
                                <User size={10} className="text-gray-400"/> {item.assignedToName}
                            </span>
                        ) : (
                            <span className="text-xs text-gray-400 italic">Unassigned</span>
                        )}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-3.5 align-middle text-right text-xs text-gray-400 font-mono">
                      {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : '--'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- Pagination Footer --- */}
      <div className="border-t border-gray-200 p-3 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Rows:</span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => setItemsPerPage(Number(e.target.value))} 
            className="border-gray-300 rounded-md text-xs py-1 px-2 bg-white focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            Page <strong>{currentPage}</strong> of <strong>{totalPages || 1}</strong>
          </span>
          <div className="flex gap-1">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:shadow-none transition-all border border-transparent hover:border-gray-200"
            >
              <ChevronLeft size={18} className="text-gray-600"/>
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:shadow-none transition-all border border-transparent hover:border-gray-200"
            >
              <ChevronRight size={18} className="text-gray-600"/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}