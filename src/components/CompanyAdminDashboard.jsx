// src/components/CompanyAdminDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- IMPORTED useNavigate
import { useData } from '../App.jsx';
import { loadApplications } from '../firebase/firestore.js';
import { getFieldValue, getStatusColor } from '../utils/helpers.js';
import { ApplicationDetailView } from './ApplicationDetailView.jsx'; 
import { auth } from '../firebase/config.js'; 
import { getPortalUser } from '../firebase/firestore.js'; 
import { ManageTeamModal } from './ManageTeamModal.jsx';
import { LogOut, Search, ChevronDown, Users, FileText, CheckSquare, Bell, ArrowDownUp, AlertTriangle, User, ChevronUp, UserPlus, Replace, Settings } from 'lucide-react';

// --- Reusable Stat Card Component ---
function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className="flex items-center gap-2 mt-1">
        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md">
          {icon}
        </div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// --- Reusable Red Flag Badge Component ---
function FlagBadge({ text }) {
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
      <AlertTriangle size={12} />
      {text}
    </span>
  );
}

// --- Helper function for sorting ---
const sortApplications = (apps, config) => {
  const { key, direction } = config;
  
  return [...apps].sort((a, b) => {
    let aVal, bVal;
    
    // Get values based on sort key
    switch(key) {
      case 'name':
        aVal = `${a['firstName'] || ''} ${a['lastName'] || ''}`.toLowerCase().trim();
        bVal = `${b['firstName'] || ''} ${b['lastName'] || ''}`.toLowerCase().trim();
        break;
      case 'dob':
        aVal = a['dob'] || '';
        bVal = b['dob'] || '';
        break;
      case 'state':
        aVal = a['state'] || '';
        bVal = b['state'] || '';
        break;
      case 'submittedAt':
      default:
        aVal = a.submittedAt?.seconds || 0;
        bVal = b.submittedAt?.seconds || 0;
        break;
    }

    if (aVal < bVal) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aVal > bVal) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

// --- Main Dashboard Component ---
export function CompanyAdminDashboard() {
  const { currentCompanyProfile, handleLogout, returnToCompanyChooser, currentUserClaims } = useData();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sortConfig, setSortConfig] = useState({ key: 'submittedAt', direction: 'desc' });
  const [selectedApp, setSelectedApp] = useState(null);

  const [userName, setUserName] = useState('Admin User');
  const [userEmail, setUserEmail] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  const navigate = useNavigate(); // <-- HOOK INITIALIZED
  const companyId = currentCompanyProfile?.id;
  const companyName = currentCompanyProfile?.companyName;

  const isCompanyAdmin = currentUserClaims?.roles[companyId] === 'company_admin';

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserEmail(user.email);
        const portalUserDoc = await getPortalUser(user.uid);
        if (portalUserDoc && portalUserDoc.name) {
          setUserName(portalUserDoc.name);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  async function refreshApplicationList(companyId) {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const appList = await loadApplications(companyId); 
      setApplications(appList);
    } catch (err) {
      console.error("Error loading applications: ", err);
      setError("Could not load applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (companyId) {
      refreshApplicationList(companyId);
    }
  }, [companyId]);
  
  const filteredApplications = useMemo(() => {
    const searchTerm = searchQuery.toLowerCase();
    
    const filtered = applications.filter(app => {
      const name = `${app['firstName'] || ''} ${app['lastName'] || ''}`.toLowerCase();
      const phone = app.phone?.toLowerCase() || '';
      return name.includes(searchTerm) || phone.includes(searchTerm);
    });
    
    return sortApplications(filtered, sortConfig);
    
  }, [searchQuery, applications, sortConfig]);
  
  const handleAppUpdate = () => {
    refreshApplicationList(companyId);
  }
  
  const handleSortChange = (e) => {
    const [key, direction] = e.target.value.split(',');
    setSortConfig({ key, direction });
  };
  
  const leadsCount = useMemo(() => {
    return applications.filter(app => 
      app.status === 'New Application' || app.status === 'Pending Review'
    ).length;
  }, [applications]);
  
  const qualificationCount = useMemo(() => {
    return applications.filter(app => 
      app.status === 'Background Check' || app.status === 'Awaiting Documents'
    ).length;
  }, [applications]);
  
  const onboardingCount = useMemo(() => {
    return applications.filter(app => 
      app.status === 'Approved'
    ).length;
  }, [applications]);
  
  const getApplicantFlags = (app) => {
    const flags = [];
    if (!app) return flags;
    
    if (app['drug-test-positive'] === 'yes') {
      flags.push('Failed Drug Test');
    }
    if (app['revoked-licenses'] === 'yes') {
      flags.push('Revoked License');
    }
    if (app['driving-convictions'] === 'yes') {
        flags.push('Driving Convictions');
    }
    if (app.accidents && Array.isArray(app.accidents) && app.accidents.some(a => a.preventable === 'yes')) {
      flags.push('Preventable Accident');
    }
    
    return flags;
  };

  return (
    <>
      <div id="company-admin-container" className="h-screen bg-gray-50 flex flex-col">
        <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200 shrink-0">
          <div className="container mx-auto p-4 flex justify-between items-center">
            {/* Header Left Side */}
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {companyName || "Company Dashboard"}
              </h1>
              <p className="text-sm text-gray-500">Applications Portal</p>
            </div>
            
            {/* Header Right Side (User Dropdown) */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                 <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-lg">
                   {userName.charAt(0).toUpperCase()}
                 </div>
                 <div className="hidden sm:block text-left">
                    <p className="font-semibold text-gray-800">{userName}</p>
                    <p className="text-xs text-gray-500">{userEmail}</p>
                 </div>
                 {isUserMenuOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {/* --- The Dropdown Menu --- */}
              {isUserMenuOpen && (
                <div 
                  className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
                  onClick={() => setIsUserMenuOpen(false)} // Close on click
                >
                  <div className="p-4 border-b border-gray-200">
                    <p className="font-semibold text-gray-800">{userName}</p>
                    <p className="text-sm text-gray-500">{userEmail}</p>
                  </div>
                  <nav className="p-2">
                    {/* --- UPDATED SETTINGS BUTTON --- */}
                    <button 
                      onClick={() => navigate('/company/settings')} 
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-700 hover:bg-gray-100"
                    >
                      <Settings size={16} />
                      Settings
                    </button>
                    {/* ------------------------------- */}

                    {isCompanyAdmin && (
                      <button 
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-700 hover:bg-gray-100"
                      >
                        <UserPlus size={16} />
                        Manage Team
                      </button>
                    )}
                    <button 
                      onClick={returnToCompanyChooser}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-700 hover:bg-gray-100"
                    >
                      <Replace size={16} />
                      Switch Company
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="container mx-auto p-4 sm:p-8 shrink-0">
          {/* --- Stat Cards --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Leads" value={leadsCount} icon={<Users size={20}/>} />
            <StatCard title="Application" value={applications.length} icon={<FileText size={20}/>} />
            <StatCard title="Qualification" value={qualificationCount} icon={<CheckSquare size={20}/>} />
            <StatCard title="Onboarding" value={onboardingCount} icon={<Bell size={20}/>} />
          </div>
        </div>

        <main className="container mx-auto px-4 sm:px-8 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden flex-1 min-h-0">
          
          {/* --- Left Column: Applicant List --- */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col min-h-0">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex-1 flex flex-col h-full">
              <div className="p-5 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700">Applicants</h2>
                <p className="text-sm text-gray-500">{applications.length} total applicants</p>
              </div>

              {/* Toolbar with Sorting */}
              <div className="p-5 flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-gray-200 shrink-0">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <div className="relative w-full sm:w-auto shrink-0">
                  <select
                    id="sort-select"
                    className="w-full sm:w-auto px-4 py-3 pl-10 border border-gray-300 rounded-lg shadow-sm text-gray-700 font-semibold bg-white appearance-none"
                    onChange={handleSortChange}
                    value={`${sortConfig.key},${sortConfig.direction}`}
                  >
                    <option value="submittedAt,desc">Newest First</option>
                    <option value="submittedAt,asc">Oldest First</option>
                    <option value="name,asc">Name (A-Z)</option>
                  </select>
                  <ArrowDownUp size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              
              {/* Table */}
              <div className="overflow-y-auto flex-1 min-h-0">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-5 py-3">Applicant Name</th>
                      <th className="px-5 py-3">Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading && (
                      <tr><td colSpan="2" className="p-5 text-center text-gray-500">Loading applications...</td></tr>
                    )}
                    {error && (
                      <tr><td colSpan="2" className="p-5 text-center text-red-600">{error}</td></tr>
                    )}
                    {!loading && !error && filteredApplications.length === 0 && (
                      <tr>
                        <td colSpan="2" className="p-5 text-center text-gray-500">
                          {searchQuery ? "No applications found matching your search." : "No applications found."}
                        </td>
                      </tr>
                    )}
                    {!loading && !error && filteredApplications.map(app => {
                      const currentStatus = app.status || 'New Application';
                      const name = `${getFieldValue(app['firstName'])} ${getFieldValue(app['lastName'])}`;
                      const appFlags = getApplicantFlags(app);
                      const isSelected = selectedApp?.id === app.id;

                      return (
                        <tr 
                          key={app.id} 
                          onClick={() => setSelectedApp(app)}
                          className={`cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-5 py-4 whitespace-nowrap">
                            <p className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>{name}</p>
                            <p className="text-sm text-gray-500">{getFieldValue(app.phone)}</p>
                            
                            {appFlags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {appFlags.map(flag => <FlagBadge key={flag} text={flag} />)}
                              </div>
                            )}
                            
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(currentStatus)}`}>
                              {currentStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* --- Right Column: Application Details --- */}
          <div className="lg:col-span-7 xl:col-span-8 min-h-0">
            {selectedApp ? (
              <ApplicationDetailView
                key={selectedApp.id}
                companyId={companyId}
                applicationId={selectedApp.id}
                onClosePanel={() => setSelectedApp(null)}
                onStatusUpdate={handleAppUpdate}
                isCompanyAdmin={isCompanyAdmin} 
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-white rounded-xl shadow-lg border border-gray-200">
                <p className="text-gray-500 font-medium">Select an applicant to view their details</p>
              </div>
            )}
          </div>

        </main>
      </div>

      {isAddUserModalOpen && (
        <ManageTeamModal 
          companyId={companyId} 
          onClose={() => setIsAddUserModalOpen(false)} 
        />
      )}
    </>
  );
}