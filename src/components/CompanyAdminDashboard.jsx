// src/components/CompanyAdminDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../App.jsx';
import { loadApplications } from '../firebase/firestore.js';
import { getFieldValue, getStatusColor } from '../utils/helpers.js';
import { ApplicationDetailsModal } from './ApplicationDetailsModal.jsx';
import { LogOut, ArrowLeft, Search, Filter, ChevronDown, Users, FileText, CheckSquare, Bell, ArrowDownUp } from 'lucide-react';

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
        // Use the Firestore timestamp for accurate date sorting
        aVal = a.submittedAt?.seconds || 0;
        bVal = b.submittedAt?.seconds || 0;
        break;
    }

    // Compare values
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
  const { currentCompanyProfile, handleLogout, returnToCompanyChooser } = useData();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- State for sorting ---
  const [sortConfig, setSortConfig] = useState({ key: 'submittedAt', direction: 'desc' });
  
  // --- UPDATED: State now holds the full app object ---
  const [selectedApp, setSelectedApp] = useState(null);

  const companyId = currentCompanyProfile?.id;
  const companyName = currentCompanyProfile?.companyName;

  // --- UPDATED: To handle the new array from firestore.js ---
  async function refreshApplicationList(companyId) {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const appList = await loadApplications(companyId); // This now returns an array
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
  
  // --- Memoized filtering AND sorting ---
  const filteredApplications = useMemo(() => {
    const searchTerm = searchQuery.toLowerCase();
    
    const filtered = applications.filter(app => {
      const name = `${app['firstName'] || ''} ${app['lastName'] || ''}`.toLowerCase();
      const phone = app.phone?.toLowerCase() || '';
      return name.includes(searchTerm) || phone.includes(searchTerm);
    });
    
    // Now, sort the filtered list
    return sortApplications(filtered, sortConfig);
    
  }, [searchQuery, applications, sortConfig]);
  
  // This function is passed down to the modal so it can refresh this list
  const handleAppUpdate = () => {
    refreshApplicationList(companyId);
  }
  
  // --- Handler for sorting ---
  const handleSortChange = (e) => {
    const [key, direction] = e.target.value.split(',');
    setSortConfig({ key, direction });
  };
  
  // --- Calculate Stat Card numbers ---
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
  // --- End Stat Card calculations ---

  return (
    <>
      <div id="company-admin-container" className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="container mx-auto p-4 flex justify-between items-center">
            {/* Header Left Side */}
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {companyName || "Company Dashboard"}
              </h1>
              <p className="text-sm text-gray-500">Applications Portal</p>
            </div>
            
            {/* Header Right Side */}
            <div className="flex items-center gap-3">
              <button 
                title="Switch Company"
                className="px-3 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2"
                onClick={returnToCompanyChooser}
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Switch</span>
              </button>
              <button 
                title="Logout"
                className="px-3 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all flex items-center gap-2"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
              <div className="w-px h-8 bg-gray-300 mx-2"></div>
              <div className="flex items-center gap-3">
                 <img src="https://placehold.co/40x40/60A5FA/FFF?text=A" alt="User Avatar" className="w-10 h-10 rounded-full border-2 border-gray-300" />
                 <div className="hidden sm:block">
                    <p className="font-semibold text-gray-800">Admin User</p>
                    <p className="text-xs text-gray-500">admin@company.com</p>
                 </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4 sm:p-8">
          
          {/* --- Stat Cards --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Leads" value={leadsCount} icon={<Users size={20}/>} />
            <StatCard title="Application" value={applications.length} icon={<FileText size={20}/>} />
            <StatCard title="Qualification" value={qualificationCount} icon={<CheckSquare size={20}/>} />
            <StatCard title="Onboarding" value={onboardingCount} icon={<Bell size={20}/>} />
          </div>

          {/* --- Main Application Table --- */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-700">Applicants</h2>
              <p className="text-sm text-gray-500">{applications.length} total applicants</p>
            </div>

            {/* Toolbar with Sorting */}
            <div className="p-5 flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-gray-200">
              <div className="relative w-full sm:max-w-xs">
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                
                {/* Sort Dropdown */}
                <div className="relative w-full sm:w-auto">
                  <select
                    id="sort-select"
                    className="w-full sm:w-auto px-4 py-3 pl-10 border border-gray-300 rounded-lg shadow-sm text-gray-700 font-semibold bg-white appearance-none"
                    onChange={handleSortChange}
                    value={`${sortConfig.key},${sortConfig.direction}`}
                  >
                    <option value="submittedAt,desc">Newest First</option>
                    <option value="submittedAt,asc">Oldest First</option>
                    <option value="name,asc">Name (A-Z)</option>
                    <option value="name,desc">Name (Z-A)</option>
                    <option value="dob,asc">Date of Birth (Asc)</option>
                    <option value="dob,desc">Date of Birth (Desc)</option>
                    <option value="state,asc">State (A-Z)</option>
                    <option value="state,desc">State (Z-A)</option>
                  </select>
                  <ArrowDownUp size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                
                <button className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md font-semibold flex items-center gap-2 justify-center">
                  Actions <ChevronDown size={16} />
                </button>
              </div>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3">Applicant Name</th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Position</th>
                    <th className="px-5 py-3">Application Date</th>
                    <th className="px-5 py-3">Stage</th>
                    <th className="px-5 py-3">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading && (
                    <tr><td colSpan="6" className="p-5 text-center text-gray-500">Loading applications...</td></tr>
                  )}
                  {error && (
                    <tr><td colSpan="6" className="p-5 text-center text-red-600">{error}</td></tr>
                  )}
                  {!loading && !error && filteredApplications.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-5 text-center text-gray-500">
                        {searchQuery ? "No applications found matching your search." : "No applications found."}
                      </td>
                    </tr>
                  )}
                  {!loading && !error && filteredApplications.map(app => {
                    const currentStatus = app.status || 'New Application';
                    const name = `${getFieldValue(app['firstName'])} ${getFieldValue(app['lastName'])}`;
                    return (
                      <tr 
                        key={app.id} 
                        onClick={() => setSelectedApp(app)} // <-- This correctly passes the full app object
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="font-semibold text-gray-900">{name}</p>
                          <p className="text-sm text-blue-600 hover:underline">Go to applicant &rarr;</p>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-800">{getFieldValue(app.phone)}</p>
                          <p className="text-sm text-gray-500">{getFieldValue(app.email)}</p>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-800">Truck Driver</p>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(currentStatus)}`}>
                            {currentStatus}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                          {getFieldValue(app['signature-date'])}
                        </td>
                        <td className="px-5 py-4 whitespace-nowP text-sm text-gray-600">
                          Prospect
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                          {getFieldValue(app.state)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* --- UPDATED: Render the modal using the new state object --- */}
      {selectedApp && (
        <ApplicationDetailsModal
          companyId={companyId}
          applicationId={selectedApp.id}
          // --- THIS IS THE FIX: The isNestedApp prop is removed ---
          onClose={() => setSelectedApp(null)}
          onStatusUpdate={handleAppUpdate}
        />
      )}
    </>
  );
}