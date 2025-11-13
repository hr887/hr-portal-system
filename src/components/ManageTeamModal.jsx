// src/components/ManageTeamModal.jsx
import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Loader2, User, Send } from 'lucide-react';
// --- 1. NEW IMPORTS ---
import { functions } from '../firebase/config.js'; // Import functions
import { httpsCallable } from "firebase/functions"; // Import httpsCallable
import { getMembershipsForCompany, getUsersFromIds, deleteMembership } from '../firebase/firestore.js';
import { getFieldValue } from '../utils/helpers.js';
// --- END IMPORTS ---

// --- Team Member Row Component ---
function TeamMemberRow({ user, membership, onRemoveSuccess }) {
  const [isRemoving, setIsRemoving] = useState(false);
  
  const handleRemove = async () => {
    if (window.confirm(`Are you sure you want to remove ${user.name} from this company?`)) {
      setIsRemoving(true);
      try {
        await deleteMembership(membership.id);
        onRemoveSuccess(); // This will tell the modal to refresh its list
      } catch (err) {
        console.error("Error removing membership:", err);
        alert("Failed to remove user: " + err.message);
        setIsRemoving(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-4 border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-semibold">
          {getFieldValue(user.name).charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{getFieldValue(user.name)}</p>
          <p className="text-sm text-gray-500">{getFieldValue(user.email)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 capitalize">
          {membership.role.replace('_', ' ')}
        </span>
        <button 
          title="Remove user"
          onClick={handleRemove}
          disabled={isRemoving}
          className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
        >
          {isRemoving ? <Loader2 className="animate-spin" /> : <Trash2 size={16} />}
        </button>
      </div>
    </div>
  );
}
// --- END NEW COMPONENT ---


export function ManageTeamModal({ companyId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [error, setError] = useState('');

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState(''); // --- 2. ADDED PASSWORD FIELD ---
  const [newUserRole, setNewUserRole] = useState('hr_user'); 
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(''); // --- 2. ADDED SUCCESS MESSAGE ---

  const fetchTeam = async () => {
    if (!companyId) {
      setError("No Company ID provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 1. Get all memberships for this company
      const memberSnap = await getMembershipsForCompany(companyId);
      if (memberSnap.empty) {
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      const memberships = memberSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const userIds = memberships.map(mem => mem.userId);

      // 2. Get all user profiles for those user IDs
      const userSnap = await getUsersFromIds(userIds);
      if (!userSnap || userSnap.empty) {
        throw new Error("Could not find user profiles for team members.");
      }

      const userMap = new Map();
      userSnap.docs.forEach(doc => {
        userMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      // 3. Combine the data
      const combinedTeam = memberships.map(mem => ({
        membership: mem,
        user: userMap.get(mem.userId)
      })).filter(team => team.user); // Filter out any missing users

      setTeamMembers(combinedTeam);

    } catch (err) {
      console.error("Error fetching team:", err);
      setError("Could not load team members. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [companyId]);
  
  // --- 3. THIS IS THE NEW, FULLY FUNCTIONAL INVITE LOGIC ---
  const handleInviteUser = async (e) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError('');
    setInviteSuccess('');

    // This is the logic copied from your Super Admin CreateView.jsx
    try {
      const createPortalUser = httpsCallable(functions, 'createPortalUser');
      const result = await createPortalUser({
        fullName: newUserName, 
        email: newUserEmail, 
        password: newUserPassword,
        companyId: companyId, // Pass the *current* company's ID
        role: newUserRole
      });
      
      setInviteSuccess(result.data.message || "User created successfully!");
      
      // Clear the form
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      
      // Refresh the team list
      await fetchTeam();

      // Hide success message after 3 seconds
      setTimeout(() => setInviteSuccess(''), 3000);

    } catch (error) { 
      console.error("Error creating user:", error);
      setInviteError(error.message); // Show the error from the Cloud Function
    } finally { 
      setIsInviting(false); 
    }
  };
  // --- END NEW FUNCTION ---

  return (
    <div 
      className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 flex flex-col max-h-[80vh]" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-5 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <UserPlus />
            Manage Team
          </h2>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        {/* --- Main Content --- */}
        <div className="p-5 bg-gray-50 overflow-y-auto flex-1 min-h-0">
          
          {/* --- 4. THIS IS THE UPDATED FORM --- */}
          <form className="mb-6" onSubmit={handleInviteUser}>
            <h3 className="text-lg font-semibold text-gray-700">Invite New User</h3>
            <div className="p-4 border border-gray-200 bg-white rounded-lg mt-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="newUserName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    id="newUserName"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="Jane Doe"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="newUserEmail" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    id="newUserEmail"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="jane.doe@company.com"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="newUserPassword" className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                  <input
                    type="password"
                    id="newUserPassword"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="newUserRole" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select 
                    id="newUserRole"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="hr_user">HR User (View Only)</option>
                    <option value="company_admin">Company Admin (Full Access)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center">
                {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
                {inviteSuccess && <p className="text-sm text-green-600">{inviteSuccess}</p>}
                <button
                  type="submit"
                  disabled={isInviting}
                  className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isInviting ? <Loader2 className="animate-spin" size={18} /> : <Send size={16} />}
                  {isInviting ? 'Sending Invite...' : 'Send Invite'}
                </button>
              </div>
            </div>
          </form>
          {/* --- END UPDATED FORM --- */}
          
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Current Team Members</h3>
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : teamMembers.length === 0 ? (
              <p className="text-center text-gray-500 p-8">
                No team members have been assigned to this company.
              </p>
            ) : (
              <div className="space-y-3">
                {teamMembers.map(({ user, membership }) => (
                  <TeamMemberRow 
                    key={user.id} 
                    user={user} 
                    membership={membership}
                    onRemoveSuccess={fetchTeam}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- Footer --- */}
        <footer className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end items-center rounded-b-xl shrink-0">
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