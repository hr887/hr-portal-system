// src/components/admin/CompaniesView.jsx
import React, { useState, useMemo } from 'react';
import { getFieldValue } from '../../utils/helpers.js';
import { Building, FileText, Edit2, Trash2, Search } from 'lucide-react';

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

export function CompaniesView({ 
  listLoading, 
  statsError, 
  companyList, 
  onViewApps, 
  onEdit, 
  onDelete 
}) {
  const [companySearch, setCompanySearch] = useState('');

  const filteredCompanyList = useMemo(() => {
    const searchTerm = companySearch.toLowerCase();
    if (!searchTerm) return companyList;
    
    return companyList.filter(company => {
      const name = company.companyName?.toLowerCase() || '';
      const slug = company.appSlug?.toLowerCase() || '';
      const id = company.id.toLowerCase();
      
      return name.includes(searchTerm) || slug.includes(searchTerm) || id.includes(searchTerm);
    });
  }, [companySearch, companyList]);

  return (
    <Card title="Manage Companies" icon={<Building size={22} />} className="w-full">
      <div className="p-5 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search companies by name, slug, or ID..."
            className="w-full p-3 pl-10 border border-gray-300 rounded-lg"
            value={companySearch}
            onChange={(e) => setCompanySearch(e.target.value)}
          />
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      <div id="company-list" className="p-5 space-y-4">
        {listLoading ? <p>Loading companies...</p> : (
          statsError.companies ? <p className="text-red-600">Error: Could not load companies. Check permissions.</p> :
          filteredCompanyList.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              {companySearch ? 'No companies found matching your search.' : 'No companies found.'}
            </p>
          ) :
          filteredCompanyList.map(company => (
            <div key={company.id} className="p-4 border border-gray-200 rounded-lg bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-3 sm:mb-0">
                <h3 className="font-semibold text-lg text-gray-900">{getFieldValue(company.companyName)}</h3>
                <p className="text-sm text-gray-600">/{getFieldValue(company.appSlug)}</p>
                <p className="text-xs text-gray-400 mt-1">ID: {company.id}</p>
              </div>
              <div className="flex gap-2 justify-end shrink-0">
                <button onClick={() => onViewApps({ id: company.id, name: company.companyName })} className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-all flex items-center gap-2">
                  <FileText size={14} /> View Apps
                </button>
                <button onClick={() => onEdit(company.id)} className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-all flex items-center gap-2">
                  <Edit2 size={14} /> Edit
                </button>
                <button onClick={() => onDelete({ id: company.id, name: company.companyName })} className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-all flex items-center gap-2">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
