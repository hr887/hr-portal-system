// src/components/admin/ApplicationStatusManager.jsx
import React, { useState } from 'react';
import { updateApplicationStatus } from '../../firebase/firestore.js';
import { sendNotification } from '../../lib/notificationService'; 
import { getStatusColor } from '../../utils/helpers.js';
import { Section } from './ApplicationUI.jsx';

export function ApplicationStatusManager({
  companyId,
  applicationId,
  currentStatus,
  onStatusUpdate,
  driverId 
}) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleSaveStatus = async () => {
    setStatusLoading(true);
    setStatusMessage('');
    try {
      await updateApplicationStatus(companyId, applicationId, selectedStatus);
      
      if (driverId && selectedStatus !== currentStatus) {
          await sendNotification({
              recipientId: driverId,
              title: 'Application Status Updated',
              message: `Your application status has been changed to: ${selectedStatus}`,
              type: 'info',
              link: '/driver/dashboard' 
          });
      }

      setStatusMessage('Status Saved & Driver Notified!');
      onStatusUpdate(selectedStatus);
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (err) {
      console.error("Error updating status:", err);
      setStatusMessage('Failed to save. Please try again.');
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <Section title="Application Management">
      <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4 bg-gray-50 rounded-lg p-3">
        <dt className="text-sm font-medium text-gray-700 self-center">Current Status</dt>
        <dd id="current-status-display" className={`mt-1 text-base font-bold ${getStatusColor(currentStatus)} sm:mt-0 sm:col-span-2`}>
          {currentStatus}
        </dd>
      </div>
      <div className="mt-4 space-y-3">
        <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700">Update Status</label>
        <select 
          id="edit-status" 
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="New Application">New Application</option>
          <option value="Pending Review">Pending Review</option>
          <option value="Awaiting Documents">Awaiting Documents</option>
          <option value="Background Check">Background Check</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        <button 
          id="save-status-btn" 
          className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-150 disabled:opacity-75"
          onClick={handleSaveStatus}
          disabled={statusLoading}
        >
          {statusLoading ? 'Saving...' : 'Save Status'}
        </button>
        {statusMessage && (
          <p className={`text-sm ${statusMessage.startsWith('Failed') ? 'text-red-600' : 'text-green-600'}`}>
            {statusMessage}
          </p>
        )}
      </div>
    </Section>
  );
}