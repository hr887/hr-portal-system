// src/components/company/DashboardTable.jsx
import React from 'react';
import { 
  ChevronLeft, ChevronRight, 
} from 'lucide-react';

// NEW IMPORTS
import { DashboardToolbar } from './DashboardToolbar';
import { DashboardBody, DashboardTableConfig } from './DashboardBody'; 
// CLEANUP: Imports for ResizableTable and useColumnResize are removed.

// Define fixed column widths manually to ensure proper table rendering
const FIXED_COL_WIDTHS = ["25%", "15%", "30%", "15%", "15%"]; 

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
  
  // Helper: Handle Filter Updates
  const handleFilterChangeAndResetPage = (key, value) => {
      setFilters(prev => ({ ...prev, [key]: value }));
      setCurrentPage(1); // Reset to page 1 on filter change
  };

  const clearFiltersAndResetPage = () => {
      setFilters({ state: '', driverType: '', dob: '', assignee: '' });
      setSearchQuery('');
      setCurrentPage(1);
  };
  
  return (
    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden h-full">
      
      {/* --- Toolbar Section --- */}
      <DashboardToolbar
        activeTab={activeTab}
        dataCount={data.length}
        totalCount={totalCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filters={filters}
        setFilters={handleFilterChangeAndResetPage}
        clearFilters={clearFiltersAndResetPage}
      />

      {/* --- Table Section (Restored fixed layout) --- */}
      <div className="flex-1 overflow-auto min-h-0 bg-gray-50">
        {/* We use table-fixed and colgroup for stable, fixed column widths */}
        <table className="w-full text-left border-collapse table-fixed">
          
            {/* Define explicit column widths */}
            <colgroup>
                {DashboardTableConfig.map((col, index) => (
                    <col key={col.key} style={{ width: FIXED_COL_WIDTHS[index] }} />
                ))}
            </colgroup>

            {/* Header: Uses labels from DashboardTableConfig */}
            <thead className="bg-white sticky top-0 z-10 shadow-sm text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                    {DashboardTableConfig.map(col => (
                        <th 
                            key={col.key}
                            className={`px-6 py-3 border-b border-gray-200 ${col.className || 'text-left'}`}
                        >
                            {col.label}
                        </th>
                    ))}
                </tr>
            </thead>

            {/* Body: Render rows */}
            <DashboardBody 
                data={data}
                loading={loading}
                totalCount={totalCount}
                selectedId={selectedId}
                onSelect={onSelect}
                onPhoneClick={onPhoneClick}
            />
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