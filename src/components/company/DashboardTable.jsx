// src/components/company/DashboardTable.jsx
import React, { useState, useEffect } from 'react';
import { Loader2, ArrowDown } from 'lucide-react'; // Added icons for Load More

// IMPORTS
import { DashboardToolbar } from './DashboardToolbar';
import { DashboardBody, DashboardTableConfig } from './DashboardBody'; 

// Define default column widths
const DEFAULT_COL_WIDTHS = ["25%", "15%", "30%", "15%", "15%"];
const STORAGE_KEY = 'dashboard_table_column_widths'; 

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
  // New Pagination Props
  hasMore,
  onLoadMore
}) {
  // State for column widths
  const [columnWidths, setColumnWidths] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_COL_WIDTHS;
  });
  const [resizingIndex, setResizingIndex] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidths, setStartWidths] = useState([]);

  // Save column widths to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Handle mouse down on column resizer
  const handleResizeStart = (e, index) => {
    e.preventDefault();
    setResizingIndex(index);
    setStartX(e.clientX);
    setStartWidths([...columnWidths]);
  };

  // Handle mouse move during resize
  useEffect(() => {
    if (resizingIndex === null) return;

    const handleMouseMove = (e) => {
      const delta = e.clientX - startX;
      const newWidths = [...startWidths];

      const widthNumbers = startWidths.map(w => {
        const num = parseFloat(w);
        return isNaN(num) ? 100 / DEFAULT_COL_WIDTHS.length : num;
      });

      const minWidth = 8; // Minimum 8%

      if (resizingIndex < startWidths.length - 1) {
        newWidths[resizingIndex] = Math.max(minWidth, widthNumbers[resizingIndex] + (delta / 20)) + '%';
        newWidths[resizingIndex + 1] = Math.max(minWidth, widthNumbers[resizingIndex + 1] - (delta / 20)) + '%';
      } else {
        newWidths[resizingIndex] = Math.max(minWidth, widthNumbers[resizingIndex] + (delta / 20)) + '%';
        newWidths[resizingIndex - 1] = Math.max(minWidth, widthNumbers[resizingIndex - 1] - (delta / 20)) + '%';
      }

      setColumnWidths(newWidths);
    };

    const handleMouseUp = () => {
      setResizingIndex(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingIndex, startX, startWidths]);

  // Helper: Handle Filter Updates
  const handleFilterChange = (key, value) => {
      setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
      setFilters({ state: '', driverType: '', dob: '', assignee: '' });
      setSearchQuery('');
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
        setFilters={handleFilterChange}
        clearFilters={clearFilters}
      />

      {/* --- Table Section with Resizable Columns --- */}
      <div className="flex-1 overflow-auto min-h-0 bg-gray-50 select-none flex flex-col">
        {/* We use table-fixed and colgroup for resizable column widths */}
        <table className="w-full text-left border-collapse table-fixed">

            {/* Define resizable column widths */}
            <colgroup>
                {DashboardTableConfig.map((col, index) => (
                    <col key={col.key} style={{ width: columnWidths[index] }} />
                ))}
            </colgroup>

            {/* Header */}
            <thead className="bg-white sticky top-0 z-10 shadow-sm text-xs font-bold text-gray-600 uppercase tracking-wider border-b-2 border-gray-300">
                <tr>
                    {DashboardTableConfig.map((col, index) => (
                        <th 
                            key={col.key}
                            className={`px-6 py-3 text-left relative whitespace-nowrap font-semibold overflow-visible ${resizingIndex === index ? 'bg-blue-50' : 'bg-white'}`}
                            style={{ userSelect: 'none' }}
                        >
                            <span className="pointer-events-none">{col.label}</span>
                            <div
                              onMouseDown={(e) => handleResizeStart(e, index)}
                              className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors ${
                                resizingIndex === index ? 'bg-blue-500' : 'bg-gray-300 hover:bg-blue-400'
                              }`}
                              style={{ pointerEvents: 'auto' }}
                            />
                        </th>
                    ))}
                </tr>
            </thead>

            {/* Body */}
            <DashboardBody 
                data={data}
                loading={loading && data.length === 0} // Only show skeleton if no data yet
                totalCount={totalCount}
                selectedId={selectedId}
                onSelect={onSelect}
                onPhoneClick={onPhoneClick}
            />
        </table>

        {/* --- LOAD MORE FOOTER (Replaces 1-2-3 Pagination) --- */}
        <div className="p-4 flex justify-center bg-gray-50 border-t border-gray-200">
            {loading && data.length > 0 ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="animate-spin" size={16} /> Loading more drivers...
                </div>
            ) : hasMore && data.length > 0 ? (
                <button 
                    onClick={onLoadMore}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-full hover:bg-gray-100 hover:shadow-sm transition-all text-sm"
                >
                    <ArrowDown size={16} /> Load More Drivers
                </button>
            ) : data.length > 0 ? (
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                    All records loaded
                </span>
            ) : null}
        </div>
      </div>
    </div>
  );
}