// src/components/admin/DriverSearchModal.jsx
import React, { useState } from 'react';
import { Search, MapPin, X, Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { getFieldValue } from '../../utils/helpers';
import { useDriverSearch } from '../../hooks/useDriverSearch';
import { DriverProfileView } from './DriverProfileView';

// --- CONFIG ---
const DRIVER_TYPES = [
    { value: "companyDriverSolo", label: "Company Solo" },
    { value: "companyDriverTeam", label: "Company Team" },
    { value: "ownerOperatorSolo", label: "Owner Op Solo" },
    { value: "ownerOperatorTeam", label: "Owner Op Team" },
    { value: "leaseOperatorSolo", label: "Lease Solo" },
    { value: "leaseOperatorTeam", label: "Lease Team" },
    { value: "unidentified", label: "Unidentified" }
];

const US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export function DriverSearchModal({ onClose }) {
  const [selectedDriver, setSelectedDriver] = useState(null); 
  
  const {
      selectedTypes, toggleType,
      selectedState, setSelectedState,
      statusFilter, // Kept in hook state even if not explicitly toggled here
      results, loading, error,
      currentPage, setCurrentPage,
      itemsPerPage, setItemsPerPage,
      paginatedData, totalPages,
      handleSearch
  } = useDriverSearch();

  const handleSearchClick = () => {
      setSelectedDriver(null);
      handleSearch();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
        
        {selectedDriver ? (
            <DriverProfileView 
                driver={selectedDriver} 
                onBack={() => setSelectedDriver(null)} 
            />
        ) : (
            <>
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Search className="text-blue-600" /> Search Driver Database
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={20} /></button>
                </div>

                {/* Filters */}
                <div className="p-6 bg-gray-50 border-b border-gray-200 flex flex-col gap-4 shrink-0">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Driver Type */}
                        <div className="lg:col-span-6">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Driver Types</label>
                            <div className="flex flex-wrap gap-2">
                                {DRIVER_TYPES.map(type => (
                                    <button
                                        key={type.value}
                                        onClick={() => toggleType(type.value)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                                            selectedTypes.includes(type.value)
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                        }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                                {selectedTypes.length > 0 && (
                                    <button onClick={() => toggleType('CLEAR_ALL')} className="px-2 py-1.5 text-xs text-gray-500 underline hover:text-gray-800">
                                        {/* Logic handled by toggleType if we add clear logic, or just reset in hook */}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* State Selector */}
                        <div className="lg:col-span-3">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">State</label>
                            <select 
                                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedState}
                                onChange={(e) => setSelectedState(e.target.value)}
                            >
                                <option value="">Any State</option>
                                {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                            </select>
                        </div>

                        {/* Search Button */}
                        <div className="lg:col-span-3 flex items-end">
                            <button 
                                onClick={handleSearchClick} 
                                disabled={loading}
                                className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50 h-[38px]"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                                {loading ? 'Searching...' : 'Find Drivers'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Table */}
                <div className="flex-1 overflow-auto bg-white min-h-0">
                     <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Driver Name</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Location</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Experience</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Type</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {error && <tr><td colSpan="5" className="p-8 text-center text-red-500 bg-red-50">{error}</td></tr>}
                            
                            {!loading && results.length === 0 && !error && (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center text-gray-400">
                                        <div className="flex flex-col items-center">
                                            <Filter size={48} className="mb-4 opacity-20" />
                                            <p className="text-lg">No drivers found.</p>
                                            <p className="text-sm">Adjust filters or click Search to browse the database.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {paginatedData.map(driver => {
                                const pi = driver.personalInfo || {};
                                const qual = driver.qualifications || {};
                                const dp = driver.driverProfile || {};
                                const typeLabel = DRIVER_TYPES.find(t => t.value === dp.type)?.label || dp.type;
                                
                                return (
                                    <tr key={driver.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                                                    {getFieldValue(pi.firstName).charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {getFieldValue(pi.firstName)} {pi.lastName ? pi.lastName.charAt(0) + '.' : ''}
                                                    </p>
                                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                                        {dp.availability ? dp.availability.replace('_', ' ') : 'Available'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <MapPin size={14} className="text-gray-400"/> 
                                                {getFieldValue(pi.city)}, {getFieldValue(pi.state)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle text-sm text-gray-600">
                                            {getFieldValue(qual.experienceYears)}
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                {typeLabel || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 align-middle text-right">
                                            <button 
                                                onClick={() => setSelectedDriver(driver)}
                                                className="text-blue-600 font-semibold text-sm hover:underline hover:text-blue-800 transition-colors"
                                            >
                                                View Profile
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="border-t border-gray-200 p-4 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 rounded-b-xl">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Show</span>
                        <select 
                            value={itemsPerPage} 
                            onChange={(e) => setItemsPerPage(Number(e.target.value))} 
                            className="border-gray-300 rounded-md text-xs py-1.5 pl-2 pr-6 bg-white focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span>rows</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                            Page <strong>{currentPage}</strong> of <strong>{totalPages || 1}</strong>
                        </span>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                disabled={currentPage === 1}
                                className="p-2 rounded-md bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white transition-all"
                            >
                                <ChevronLeft size={16} className="text-gray-600"/>
                            </button>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                disabled={currentPage >= totalPages}
                                className="p-2 rounded-md bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white transition-all"
                            >
                                <ChevronRight size={16} className="text-gray-600"/>
                            </button>
                        </div>
                    </div>
                </div>

            </>
        )}
      </div>
    </div>
  );
}