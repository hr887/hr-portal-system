// src/components/admin/EditUserNameForm.jsx
import React, { useState } from 'react';
import { updateUser } from '../../firebase/firestore.js';

export function EditUserNameForm({ userId, initialName, email, onSave }) {
  const [userName, setUserName] = useState(initialName);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSaveName = async () => {
    setSaveLoading(true);
    setSaveMessage('Saving...');
    try {
      await updateUser(userId, { name: userName });
      setSaveMessage('Name saved!');
      onSave(); // Refresh main list in parent dashboard
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error("Error updating user name:", error);
      setSaveMessage('Error saving name.');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">User Profile</h3>
      <form id="edit-user-form" className="space-y-4">
        <div>
          <label htmlFor="edit-user-name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input 
            type="text" 
            id="edit-user-name" 
            className="w-full p-3 border border-gray-300 rounded-lg" 
            required 
            value={userName} 
            onChange={(e) => setUserName(e.target.value)} 
          />
        </div>
        <div>
          <label htmlFor="edit-user-email" className="block text-sm font-medium text-gray-700 mb-1">Email (Read-only)</label>
          <input 
            type="email" 
            id="edit-user-email" 
            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100" 
            readOnly 
            value={email} 
          />
        </div>
        <div className="flex items-center gap-4">
          <button 
            id="edit-user-save-btn" 
            type="button" 
            className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50" 
            onClick={handleSaveName} 
            disabled={saveLoading}
          >
            {saveLoading ? 'Saving...' : 'Save Name'}
          </button>
          <p className={`text-sm ${saveMessage.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {saveMessage}
          </p>
        </div>
      </form>
    </div>
  );
}
