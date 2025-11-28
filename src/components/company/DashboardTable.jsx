// src/components/company/DashboardTable.jsx
import React, { useState } from 'react';
import { 
  Search, Phone, ChevronLeft, ChevronRight, Filter, X, 
  MapPin, User, Calendar, Briefcase, Zap, CheckCircle2 
} from 'lucide-react';
import { getFieldValue, formatPhoneNumber } from '../../utils/helpers';

// --- CONFIGURATION ---
const DRIVER_TYPE_OPTIONS = [
    "Dry Van", "Reefer", "Flatbed", "Tanker", "Box Truck", 
    "Car Hauler", "Step Deck", "Lowboy", "Conestoga", 
    "Intermodal", "Power Only", "Hotshot"
];

// Helper: Status Badge Styling
const getStatusBadgeStyles = (status) => {
    const s = (status || '').toLowerCase();
    
    // Green (Success/Hired)
    if (s.includes('hired') || s.includes('accepted') || s.includes('approved')) {
        return 'bg-green-100 text-green-800 border-green-200';
    }
    // Red (Rejected/Archived)
    if (s.includes('rejected') || s.includes('disqualified') || s.includes('declined')) {
        return 'bg-red-100 text-red-800 border-red-200';
    }
    // Purple (Background/Offer)
    if (s.includes('offer') || s.includes('background')) {
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    // Yellow/Orange (In Progress)
    if (s.includes('contacted') || s.includes('attempted') || s.includes('review') || s.includes('interview')) {
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    // Blue/Gray (New/Default)
    if (s.includes('new') || s.includes('lead')) {
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    
    return 'bg-gray-100 text-gray-700 border-gray-200';
};

export function DashboardTable({
  activeTab, 
  loading, 
  data, 
  totalCount, 
  selectedId,
  onSelect, 
  onPhoneClick,
  searchQuery, 
  setSearchQuery,
  filters, 
  setFilters,
  currentPage, 
  setCurrentPage, 
  itemsPerPage, 
  setItemsPerPage, 
  totalPages
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
      setFilters(prev => ({ ...prev, [key]: value }));
      setCurrentPage(1); // Reset to page 1 on filter change
  };

  const clearFilters = () => {
      setFilters({ state: '', driverType: '', dob: '', assignee: '' });
      setSearchQuery('');
      setCurrentPage(1);
  };

  const hasActiveFilters = filters && (filters.state || filters.driverType || filters.dob || filters.assignee);

  return (
    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden h-full">
      
      {/* --- Toolbar Section --- */}
      <div className="p-4 border-b border-gray-200 bg-white z-10 flex flex-col gap-3 shrink-0">
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {activeTab === 'find_driver' && <Zap size={18} className="text-purple-600 fill-purple-100"/>}
                  {activeTab === 'company_leads' && <Briefcase size={18} className="text-orange-600"/>}
                  {getTabTitle()}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                  Showing {data.length} of {totalCount} records
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

      {/* --- Table Section --- */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white sticky top-0 z-10 shadow-sm text-xs font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 border-b border-gray-200">Name / Contact</th>
              <th className="px-6 py-3 border-b border-gray-200">Status</th>
              <th className="px-6 py-3 border-b border-gray-200">Qualifications</th>
              <th className="px-6 py-3 border-b border-gray-200">Assignee</th>
              <th className="px-6 py-3 border-b border-gray-200 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
               // --- Loading Skeletons ---
               Array.from({ length: 6 }).map((_, i) => (
                 <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="flex gap-3"><div className="w-10 h-10 bg-gray-200 rounded-full"></div><div className="space-y-2"><div className="h-4 bg-gray-200 rounded w-32"></div><div className="h-3 bg-gray-200 rounded w-24"></div></div></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-20"></div></td>
                    <td className="px-6 py-4"><div className="space-y-2"><div className="h-3 bg-gray-200 rounded w-24"></div><div className="h-3 bg-gray-200 rounded w-16"></div></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-3 bg-gray-200 rounded w-16 ml-auto"></div></td>
                 </tr>
               ))
            ) : totalCount === 0 ? (
              <tr>
                  <td colSpan="5" className="p-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                          <Search size={32} className="opacity-20"/>
                          <p>No drivers found matching your criteria.</p>
                      </div>
                  </td>
              </tr>
            ) : (
              // --- Data Rows ---
              data.map(item => {
                const name = `${getFieldValue(item['firstName'])} ${getFieldValue(item['lastName'])}`;
                const isSelected = selectedId === item.id;
                
                // Determine Position & Types
                let types = 'Unspecified';
                if (Array.isArray(item.driverType) && item.driverType.length > 0) {
                    types = item.driverType.join(', ');
                } else if (typeof item.driverType === 'string' && item.driverType) {
                    types = item.driverType;
                }
                const position = item.positionApplyingTo || 'Driver';

                // Date Formatting
                const dateVal = item.submittedAt || item.createdAt;
                const displayDate = dateVal ? new Date(dateVal.seconds * 1000).toLocaleDateString() : '--';

                return (
                  <tr 
                    key={item.id} 
                    onClick={() => onSelect(item)} 
                    className={`cursor-pointer transition-colors group border-l-4 ${
                        isSelected 
                        ? 'bg-blue-50/60 border-l-blue-600' 
                        : 'hover:bg-gray-50 border-l-transparent'
                    }`}
                  >
                    {/* Column 1: Name & Contact */}
                    <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border shrink-0 transition-colors ${
                                isSelected 
                                ? 'bg-blue-600 text-white border-blue-600' 
                                : 'bg-gray-100 text-gray-600 border-gray-200 group-hover:bg-white'
                            }`}>
                                {name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{name}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <button 
                                        onClick={(e) => onPhoneClick(e, item)} 
                                        className="text-xs text-gray-500 hover:text-green-600 hover:bg-green-50 rounded px-1 -ml-1 py-0.5 flex items-center gap-1 transition-all"
                                        title="Call Driver"
                                    >
                                        <Phone size={12} /> {formatPhoneNumber(getFieldValue(item.phone))}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </td>

                    {/* Column 2: Status */}
                    <td className="px-6 py-4 align-middle">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusBadgeStyles(item.status)}`}>
                        {item.status || 'New'}
                      </span>
                    </td>

                    {/* Column 3: Details */}
                    <td className="px-6 py-4 align-middle">
                       <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-1 text-xs font-bold text-gray-700">
                               <Briefcase size={12} className="text-gray-400"/> {position}
                           </div>
                           <p className="text-[10px] text-gray-500 max-w-[150px] truncate" title={types}>
                               {types}
                           </p>
                           <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                               {item.experience || item['experience-years'] ? (
                                   <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                       {item.experience || item['experience-years']} Exp
                                   </span>
                               ) : null}
                               {item.state && (
                                   <span className="flex items-center gap-0.5">
                                       <MapPin size={10}/> {item.state}
                                   </span>
                               )}
                           </div>
                       </div>
                    </td>

                    {/* Column 4: Assignee */}
                    <td className="px-6 py-4 align-middle">
                        {item.assignedToName ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200 w-fit shadow-sm">
                                <div className="w-4 h-4 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[8px] font-bold">
                                    {item.assignedToName.charAt(0)}
                                </div>
                                {item.assignedToName}
                            </span>
                        ) : (
                            <span className="text-xs text-gray-400 italic flex items-center gap-1">
                                <User size={12}/> Unassigned
                            </span>
                        )}
                    </td>

                    {/* Column 5: Date */}
                    <td className="px-6 py-4 align-middle text-right text-xs text-gray-500 font-mono">
                       <div className="flex flex-col items-end gap-1">
                           <span className="flex items-center gap-1"><Calendar size={12} className="opacity-50"/> {displayDate}</span>
                       </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* --- Footer: Pagination --- */}
      <div className="border-t border-gray-200 p-3 bg-white flex flex-col sm:flex-row justify-between items-center gap-3 text-sm shrink-0 z-20">
        
        {/* Rows per page */}
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-xs font-medium uppercase tracking-wide">Rows per page:</span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => setItemsPerPage(Number(e.target.value))} 
            className="border-gray-300 rounded-md text-xs py-1 px-2 bg-gray-50 hover:bg-white focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition-colors"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-xs">
            Page <strong>{currentPage}</strong> of <strong>{totalPages || 1}</strong>
          </span>
          <div className="flex gap-1">
            <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1} 
                className="p-1.5 rounded-md hover:bg-gray-100 border border-transparent hover:border-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
                <ChevronLeft size={18}/>
            </button>
            <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage >= totalPages} 
                className="p-1.5 rounded-md hover:bg-gray-100 border border-transparent hover:border-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
                <ChevronRight size={18}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}