// src/components/admin/UsersView.jsx
import React, { useState, useMemo } from 'react';
import { getFieldValue } from '../../utils/helpers.js';
import { Users, Briefcase, Edit2, Trash2, AlertTriangle, Search } from 'lucide-react';

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

export function UsersView({ 
  listLoading, 
  statsError, 
  userList, 
  allCompaniesMap, 
  onEdit, 
  onDelete 
}) {
  const [userSearch, setUserSearch] = useState('');

  const filteredUserList = useMemo(() => {
    const searchTerm = userSearch.toLowerCase();
    if (!searchTerm) return userList;

    return userList.filter(user => {
      return (user.name?.toLowerCase().includes(searchTerm) ||
              user.email?.toLowerCase().includes(searchTerm));
    });
  }, [userSearch, userList]);

  return (
    <Card title="Manage All Users" icon={<Users size={22} />} className="w-full">
      <div className="p-5 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users by name or email..."
            className="w-full p-3 pl-10 border border-gray-300 rounded-lg"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      <div id="user-list" className="p-5 space-y-4">
        {listLoading ? <p>Loading users...</p> : (
          statsError.users ? <p className="text-red-600">Error: Could not load users. Check permissions.</p> :
          filteredUserList.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              {userSearch ? 'No users found matching your search.' : 'No users found.'}
            </p>
          ) :
          filteredUserList.map(user => (
            <div key={user.id} className="p-4 border border-gray-200 rounded-lg bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{getFieldValue(user.name)}</h3>
                  <p className="text-sm text-gray-600">{getFieldValue(user.email)}</p>
                  <p className="text-xs text-gray-400 mt-1">User ID: {user.id}</p>
                </div>
                <div className="flex gap-2 justify-end shrink-0 mt-3 sm:mt-0">
                  <button onClick={() => onEdit({ id: user.id })} className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-all flex items-center gap-2">
                    <Edit2 size={14} /> Edit
                  </button>
                  <button onClick={() => onDelete({ id: user.id, name: user.name })} className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-all flex items-center gap-2">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Permissions:</h4>
                <div className="flex flex-wrap gap-2">
                  {user.globalRole === 'super_admin' ? (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1.5"><AlertTriangle size={14} />Super Admin</span>
                  ) : user.memberships.length > 0 ? (
                    user.memberships.map(mem => (
                      <div key={mem.companyId} className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 flex items-center gap-1.5">
                        <Briefcase size={14} />
                        {mem.role.replace('_', ' ')} at {allCompaniesMap.get(mem.companyId) || "Unknown"}
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500 italic">No company access</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
