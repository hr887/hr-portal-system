// src/components/admin/ApplicationModals.jsx
import React, { useState, useEffect } from 'react';
// --- THIS IS THE FIX: All paths are now "../../" ---
import { loadCompanies, deleteApplication, moveApplication } from '../../firebase/firestore.js';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';

// --- Move Application Modal ---
export function MoveApplicationModal({ sourceCompanyId, applicationId, onClose, onMoveComplete }) {
  const [loading, setLoading] = useState(true);
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [destinationCompanyId, setDestinationCompanyId] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const snap = await loadCompanies();
        const companies = snap.docs
          .map(doc => ({ id: doc.id, name: doc.data().companyName }))
          .filter(c => c.id !== sourceCompanyId); // Exclude the current company
        setAvailableCompanies(companies);
        if (companies.length > 0) setDestinationCompanyId(companies[0].id);
      } catch (error) {
        setMessage('Failed to load company list.');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, [sourceCompanyId]);

  const handleMove = async () => {
    if (!destinationCompanyId || destinationCompanyId === sourceCompanyId) {
      setMessage('Please select a different company.');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage('Moving...');
    setMessageType('');

    try {
      // This is the call to the Cloud Function
      const result = await moveApplication(sourceCompanyId, destinationCompanyId, applicationId);
      setMessage(`Successfully moved to ${availableCompanies.find(c => c.id === destinationCompanyId).name}!`);
      setMessageType('success');
      // Wait for success message, then close
      setTimeout(() => {
        onMoveComplete(); 
      }, 1500);
    } catch (error) {
      console.error("Move failed:", error);
      setMessage(error.message || 'Application move failed. Ensure the moveApplication Cloud Function is deployed.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[60] backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200" onClick={e => e.stopPropagation()}>
        <header className="p-5 border-b border-gray-200 flex items-center gap-3">
          <ArrowRight className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Move Application</h2>
        </header>
        
        <div className="p-5 space-y-4">
          <p className="text-gray-700">Select the destination company for this application.</p>
          
          {loading ? (
            <p className="text-gray-500">Loading companies...</p>
          ) : availableCompanies.length === 0 ? (
            <p className="text-red-600">No other companies available.</p>
          ) : (
            <div>
              <label htmlFor="destination-company" className="block text-sm font-medium text-gray-700 mb-1">Destination Company</label>
              <select
                id="destination-company"
                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                value={destinationCompanyId}
                onChange={(e) => setDestinationCompanyId(e.target.value)}
              >
                {availableCompanies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          
          {message && <p className={`text-sm ${messageType === 'error' ? 'text-red-600' : 'text-green-600'} p-2 bg-gray-50 rounded-lg`}>{message}</p>}
        </div>
        
        <footer className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all" 
            onClick={handleMove} 
            disabled={loading || availableCompanies.length === 0}
          >
            {loading && message.includes('Moving') ? 'Moving...' : 'Move Application'}
          </button>
        </footer>
      </div>
    </div>
  );
}
// --- End Move Application Modal ---


// --- Delete Confirmation Modal ---
export function DeleteConfirmModal({ appName, companyId, applicationId, onClose, onDeletionComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      await deleteApplication(companyId, applicationId); 
      onDeletionComplete();
    } catch (err) {
      console.error("Error deleting application:", err);
      setError(err.message || 'Failed to delete application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[60] backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-200" onClick={e => e.stopPropagation()}>
        <header className="p-5 border-b border-gray-200 flex items-center gap-3">
          <AlertTriangle className="text-red-600" size={24} />
          <h2 className="text-xl font-bold text-red-700">Confirm Deletion</h2>
        </header>
        <div className="p-5">
          <p className="text-gray-600 mb-4">
            Are you sure you want to permanently delete the application for <strong className="font-bold text-gray-900">{appName}</strong>? 
            This action cannot be undone.
          </p>
          {error && <p className="text-sm text-red-600 mb-4 p-2 bg-red-50 rounded-lg border border-red-200">{error}</p>}
        </div>
        <footer className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all" onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </footer>
      </div>
    </div>
  );
}
// --- End Delete Confirmation Modal ---