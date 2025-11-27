// src/components/company/DashboardTable.jsx
import React from 'react';
import { Search, Phone, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getFieldValue, formatPhoneNumber } from '../../utils/helpers';

export function DashboardTable({
  // Data & State
  activeTab,
  loading,
  data, // The paginated data
  totalCount, // Total filtered count
  selectedId,
  
  // Actions
  onSelect,
  onPhoneClick,
  
  // Search
  searchQuery,
  setSearchQuery,
  
  // Pagination
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  totalPages
}) {

  const getTabTitle = () => {
    if (activeTab === 'applications') return 'Direct Applications';
    if (activeTab === 'find_driver') return 'SafeHaul Network Leads';
    if (activeTab === 'my_leads') return 'My Imported Leads';
    return 'Drivers';
  };

  return (
    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
      
      {/* --- Toolbar --- */}
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white z-10">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{getTabTitle()}</h2>
          <p className="text-xs text-gray-500">Showing {data.length} of {totalCount} records</p>
        </div>
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input 
            type="text" 
            placeholder="Search by name or phone..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      {/* --- Table --- */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Name / Contact</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Status</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Experience</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="4" className="p-10 text-center text-gray-500"><Loader2 className="animate-spin mx-auto mb-2"/>Loading data...</td></tr>
            ) : totalCount === 0 ? (
              <tr><td colSpan="4" className="p-10 text-center text-gray-400">No drivers found.</td></tr>
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
                    <td className="px-6 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-600 group-hover:bg-white group-hover:shadow-sm'}`}>
                          {name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{name}</p>
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
                    <td className="px-6 py-3.5 align-middle">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'New Lead' || item.status === 'New Application' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'Contacted' ? 'bg-yellow-100 text-yellow-800' :
                        item.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {item.status || 'New'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 align-middle text-sm text-gray-600">
                      {item.experience || item['experience-years'] || 'N/A'}
                    </td>
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
      <div className="border-t border-gray-200 p-3 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Rows per page:</span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => setItemsPerPage(Number(e.target.value))} 
            className="border-gray-300 rounded-md text-xs py-1.5 pl-2 pr-6 bg-white focus:ring-blue-500 focus:border-blue-500"
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
              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:shadow-none transition-all"
            >
              <ChevronLeft size={18} className="text-gray-600"/>
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:shadow-none transition-all"
            >
              <ChevronRight size={18} className="text-gray-600"/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}