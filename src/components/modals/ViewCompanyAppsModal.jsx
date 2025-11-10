// src/components/modals/ViewCompanyAppsModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { loadApplications } from '../../firebase/firestore.js';
import { getFieldValue, getStatusColor } from '../../utils/helpers.js';
import { X, Search } from 'lucide-react';

export function ViewCompanyAppsModal({ companyId, companyName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchApplications() {
      if (!companyId) return;
      setLoading(true);
      setError('');
      try {
        const querySnapshot = await loadApplications(companyId);
        if (!querySnapshot || querySnapshot.empty) {
          setApplications([]);
        } else {
          const appList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setApplications(appList);
        }
      } catch (err) {
        console.error("Error loading applications:", err);
        setError("Could not load applications for this company. Check permissions.");
      } finally {
        setLoading(false);
      }
    }
    fetchApplications();
  }, [companyId]);

  // Filter logic for this modal's search bar
  const filteredApplications = useMemo(() => {
    const searchTerm = search.toLowerCase();
    if (!searchTerm) return applications;
    
    return applications.filter(app => {
      const name = `${app['first-name'] || ''} ${app['last-name'] || ''}`.toLowerCase();
      return (name.includes(searchTerm) ||
              app.email?.toLowerCase().includes(searchTerm) ||
              app.status?.toLowerCase().includes(searchTerm));
    });
  }, [search, applications]);

  return (
    <div 
      id="view-apps-modal" 
      className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-5 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Driver Applications</h2>
            <p className="text-sm text-gray-500">For: {companyName}</p>
          </div>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        
        <div className="p-5 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, or status..."
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 bg-gray-50">
          {loading && <p className="text-center text-gray-500 py-4">Loading applications...</p>}
          {error && <p className="text-center text-red-600 py-4">{error}</p>}
          {!loading && !error && filteredApplications.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              {search ? "No applications found matching your search." : "No applications found for this company."}
            </p>
          )}
          {!loading && !error && filteredApplications.map(app => (
            <div key={app.id} className="p-4 border border-gray-200 rounded-lg bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{`${getFieldValue(app['first-name'])} ${getFieldValue(app['last-name'])}`}</h3>
                <p className="text-sm text-gray-600">{getFieldValue(app.email)}</p>
                <p className="text-sm text-gray-500">CDL: {getFieldValue(app['cdl-number'])}</p>
              </div>
              <span className={`mt-2 sm:mt-0 px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(app.status || 'New Application')}`}>
                {app.status || 'New Application'}
              </span>
            </div>
          ))}
        </div>
        
        <footer className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end items-center rounded-b-xl">
          <button 
            className="px-5 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all" 
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
