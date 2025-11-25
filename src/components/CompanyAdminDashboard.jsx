// src/components/CompanyAdminDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useData } from '../App.jsx';
import { loadApplications, loadCompanyLeads } from '../firebase/firestore.js';
import { getFieldValue } from '../utils/helpers.js';
import { ApplicationDetailView } from './ApplicationDetailView.jsx'; 
import { auth } from '../firebase/config.js'; 
import { getPortalUser } from '../firebase/firestore.js'; 
import { ManageTeamModal } from './ManageTeamModal.jsx';
import { DriverSearchModal } from './admin/DriverSearchModal.jsx';
import { NotificationBell } from './feedback/NotificationBell.jsx'; 
import { CallOutcomeModal } from './modals/CallOutcomeModal.jsx'; 
import { CompanyBulkUpload } from './CompanyBulkUpload.jsx';
import { LogOut, Search, ChevronDown, Users, FileText, CheckSquare, Settings, Zap, ChevronUp, UserPlus, Replace, Phone, Upload, Database } from 'lucide-react';

function StatCard({ title, value, icon, active, onClick, colorClass }) {
  return (
    <div 
      onClick={onClick}
      className={`p-5 rounded-lg shadow-sm border transition-all cursor-pointer flex flex-col justify-between h-full
        ${active 
          ? `ring-2 ring-offset-1 ${colorClass} bg-white` 
          : 'bg-white border-gray-200 hover:bg-gray-50'
        }`}
    >
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className="flex items-center gap-3 mt-2">
        <div className={`p-2 rounded-md ${active ? 'text-white' : ''} ${active ? colorClass.replace('ring-', 'bg-') : 'bg-gray-100 text-gray-600'}`}>
          {icon}
        </div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

const sortApplications = (apps, config) => {
  const { key, direction } = config;
  return [...apps].sort((a, b) => {
    let aVal, bVal;
    const getString = (obj, k) => {
       if(k === 'name') return `${obj['firstName']||''} ${obj['lastName']||''}`.toLowerCase();
       if(k === 'submittedAt') return obj.submittedAt?.seconds || obj.createdAt?.seconds || 0;
       return (obj[k] || '').toString().toLowerCase();
    };

    aVal = getString(a, key);
    bVal = getString(b, key);

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export function CompanyAdminDashboard() {
  const { currentCompanyProfile, handleLogout, returnToCompanyChooser, currentUserClaims } = useData();
  
  const [applications, setApplications] = useState([]);     
  const [platformLeads, setPlatformLeads] = useState([]);   
  const [companyLeads, setCompanyLeads] = useState([]);     
  
  const [activeTab, setActiveTab] = useState('applications'); 
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'submittedAt', direction: 'desc' });
  const [selectedApp, setSelectedApp] = useState(null);

  const [userName, setUserName] = useState('Admin User');
  const [userEmail, setUserEmail] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isDriverSearchOpen, setIsDriverSearchOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  const [callModalData, setCallModalData] = useState(null); 

  const navigate = useNavigate();
  const companyId = currentCompanyProfile?.id;
  const companyName = currentCompanyProfile?.companyName;
  const isCompanyAdmin = currentUserClaims?.roles[companyId] === 'company_admin';

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserEmail(user.email);
        const portalUserDoc = await getPortalUser(user.uid);
        if (portalUserDoc && portalUserDoc.name) setUserName(portalUserDoc.name);
      }
    });
    return () => unsubscribe();
  }, []);

  async function refreshData(compId) {
    if (!compId) return;
    setLoading(true);
    setError('');
    try {
      const [appList, allLeads] = await Promise.all([
          loadApplications(compId),
          loadCompanyLeads(compId)
      ]);
      
      setApplications(appList);

      // --- FIXED SPLIT LOGIC ---
      // 1. Company Leads = Explicitly have source 'Company Import'
      const cLeads = allLeads.filter(l => l.source === 'Company Import');
      
      // 2. Platform Leads = Everything else in the leads collection
      // (Since we only have two sources: Platform or Import)
      const pLeads = allLeads.filter(l => l.source !== 'Company Import');

      setPlatformLeads(pLeads);
      setCompanyLeads(cLeads);

    } catch (err) {
      console.error("Error loading data: ", err);
      setError("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (companyId) {
       refreshData(companyId);
    }
  }, [companyId]);
  
  const currentList = useMemo(() => {
      switch(activeTab) {
          case 'applications': return applications;
          case 'find_driver': return platformLeads;
          case 'my_leads': return companyLeads;
          default: return applications;
      }
  }, [activeTab, applications, platformLeads, companyLeads]);

  const filteredList = useMemo(() => {
    const searchTerm = searchQuery.toLowerCase();
    const filtered = currentList.filter(item => {
      const name = `${item['firstName'] || ''} ${item['lastName'] || ''}`.toLowerCase();
      const phone = item.phone?.toLowerCase() || '';
      return name.includes(searchTerm) || phone.includes(searchTerm);
    });
    return sortApplications(filtered, sortConfig);
  }, [searchQuery, currentList, sortConfig]);
  
  const handlePhoneClick = (e, item) => {
      if(e) e.stopPropagation(); 
      if(item && item.phone) {
          window.location.href = `tel:${item.phone}`;
          setCallModalData({ lead: item });
      } else {
          alert("No phone number available for this driver.");
      }
  };

  const getTabTitle = () => {
      if (activeTab === 'applications') return 'Direct Applications';
      if (activeTab === 'find_driver') return 'SafeHaul Network Leads';
      if (activeTab === 'my_leads') return 'My Imported Leads';
  };

  return (
    <>
      <div id="company-admin-container" className="h-screen bg-gray-50 flex flex-col">
        <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200 shrink-0">
          <div className="container mx-auto p-4 flex justify-between items-center">
            <div>
               <h1 className="text-xl font-bold text-gray-800">{companyName || "Company Dashboard"}</h1>
              <p className="text-sm text-gray-500">Recruitment Portal</p>
            </div>
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setIsUploadModalOpen(true)}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <Upload size={16} /> Import Leads
                </button>

                <button onClick={() => setIsDriverSearchOpen(true)} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                    <Search size={16} /> Search DB
                </button>
                
                <NotificationBell userId={auth.currentUser?.uid} />

                 <div className="relative">
                <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-lg">{userName.charAt(0).toUpperCase()}</div>
                    <div className="hidden sm:block text-left">
                        <p className="font-semibold text-gray-800">{userName}</p>
                        <p className="text-xs text-gray-500">{userEmail}</p>
                    </div>
                    {isUserMenuOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {isUserMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50" onClick={() => setIsUserMenuOpen(false)}>
                    <nav className="p-2">
                        <button onClick={() => navigate('/company/settings')} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-700 hover:bg-gray-100"><Settings size={16} /> Settings</button>
                         {isCompanyAdmin && <button onClick={() => setIsAddUserModalOpen(true)} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-700 hover:bg-gray-100"><UserPlus size={16} /> Manage Team</button>}
                        <button onClick={returnToCompanyChooser} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-700 hover:bg-gray-100"><Replace size={16} /> Switch Company</button>
                        <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-red-600 hover:bg-red-50"><LogOut size={16} /> Logout</button>
                    </nav>
                    </div>
                )}
                </div>
              </div>
          </div>
        </header>

        <div className="container mx-auto p-4 sm:p-8 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <StatCard 
                    title="Direct Applications" 
                    value={applications.length} 
                    icon={<FileText size={24}/>} 
                    active={activeTab === 'applications'}
                    colorClass="ring-blue-500 bg-blue-500"
                    onClick={() => setActiveTab('applications')}
                />
                <StatCard 
                    title="Find a Driver" 
                    value={platformLeads.length} 
                    icon={<Zap size={24}/>} 
                    active={activeTab === 'find_driver'}
                    colorClass="ring-purple-500 bg-purple-500"
                    onClick={() => setActiveTab('find_driver')}
                />
                <StatCard 
                    title="My Leads" 
                    value={companyLeads.length} 
                    icon={<Database size={24}/>} 
                    active={activeTab === 'my_leads'}
                    colorClass="ring-green-500 bg-green-500"
                    onClick={() => setActiveTab('my_leads')}
                />
          </div>
        </div>

        <main className="container mx-auto px-4 sm:px-8 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden flex-1 min-h-0">
          {/* --- LEFT LIST --- */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col min-h-0">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex-1 flex flex-col h-full">
              <div className="p-5 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-800">
                    {getTabTitle()}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                    {activeTab === 'applications' && 'Drivers who applied directly to your company.'}
                    {activeTab === 'find_driver' && 'Drivers matched via SafeHaul network.'}
                    {activeTab === 'my_leads' && 'Leads uploaded by your team.'}
                </p>
              </div>

              <div className="p-5 flex flex-col gap-4 border-b border-gray-200 shrink-0">
                <div className="relative w-full">
                  <input type="text" placeholder="Search driver..." className="w-full p-3 pl-10 border border-gray-300 rounded-lg" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                   <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              
              <div className="overflow-y-auto flex-1 min-h-0">
                 <table className="w-full">
                  <tbody className="divide-y divide-gray-200">
                    {loading && <tr><td className="p-5 text-center text-gray-500">Loading...</td></tr>}
                    {!loading && filteredList.length === 0 && <tr><td className="p-5 text-center text-gray-500">No drivers found in this tab.</td></tr>}
                    {!loading && filteredList.map(item => {
                      const name = `${getFieldValue(item['firstName'])} ${getFieldValue(item['lastName'])}`;
                      const isSelected = selectedApp?.id === item.id;
                      
                      const isPlatform = activeTab === 'find_driver';
                      const isCompany = activeTab === 'my_leads';

                      return (
                         <tr key={item.id} onClick={() => setSelectedApp(item)} className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <td className="px-5 py-4">
                            <div className="flex justify-between items-start">
                                 <div>
                                    <p className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>{name}</p>
                                    <button 
                                        onClick={(e) => handlePhoneClick(e, item)}
                                        className="text-sm text-gray-500 flex items-center gap-1 hover:text-blue-600 hover:underline mt-1 group"
                                        title="Click to Call"
                                    >
                                        <Phone size={12} className="group-hover:fill-blue-100"/> {getFieldValue(item.phone)}
                                    </button>
                                </div>
                                <div>
                                    {isPlatform && <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider block text-right mb-1">SafeHaul</span>}
                                    {isCompany && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider block text-right mb-1">Import</span>}
                                </div>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                                <span className="text-xs text-gray-400">
                                     {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}
                                </span>
                                {item.status && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${item.status === 'New Lead' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {item.status}
                                    </span>
                                )}
                            </div>
                          </td>
                       </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
             </div>
          </div>

          {/* --- RIGHT DETAIL PANEL --- */}
          <div className="lg:col-span-7 xl:col-span-8 min-h-0">
            {selectedApp ? (
               // IF it is a Platform Lead OR Company Lead -> Show Simple Card
               (activeTab === 'find_driver' || activeTab === 'my_leads') ? (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full p-8 overflow-y-auto">
                       <div className="flex items-center gap-3 mb-6">
                          <div className={`p-3 rounded-full ${activeTab === 'find_driver' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                              {activeTab === 'find_driver' ? <Zap size={32} /> : <Database size={32} />}
                          </div>
                          <div>
                              <h2 className="text-2xl font-bold text-gray-900">
                                  {activeTab === 'find_driver' ? 'SafeHaul Driver Lead' : 'Company Imported Lead'}
                              </h2>
                             <p className="text-gray-500">
                                 {activeTab === 'find_driver' ? 'Matched via SafeHaul network.' : 'Uploaded by your team.'}
                             </p>
                           </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6 mb-8">
                          <div><label className="text-xs font-bold text-gray-500 uppercase">Name</label><p className="text-lg">{selectedApp.firstName} {selectedApp.lastName}</p></div>
                           <div>
                               <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
                               <button onClick={(e) => handlePhoneClick(e, selectedApp)} className="text-lg text-blue-600 hover:underline block">
                                   {selectedApp.phone || 'N/A'}
                               </button>
                           </div>
                          <div><label className="text-xs font-bold text-gray-500 uppercase">Email</label><p className="text-lg">{selectedApp.email || 'N/A'}</p></div>
                          <div><label className="text-xs font-bold text-gray-500 uppercase">Experience</label><p className="text-lg">{selectedApp.experience || 'N/A'}</p></div>
                          <div><label className="text-xs font-bold text-gray-500 uppercase">Driver Type</label><p className="text-lg">{selectedApp.driverType || 'Not Specified'}</p></div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 text-center">
                          <p className="text-blue-800 font-medium mb-4">Contact this driver to initiate the hiring process.</p>
                          <div className="flex justify-center gap-3">
                              <button 
                                onClick={(e) => handlePhoneClick(e, selectedApp)}
                                className="px-6 py-3 bg-white border border-blue-200 text-blue-700 font-bold rounded-lg shadow-sm hover:bg-blue-50 transition-all flex items-center gap-2"
                              >
                                <Phone size={18}/> Call Now
                              </button>
                              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all">
                                Send Invite
                              </button>
                          </div>
                      </div>
                  </div>
               ) : (
                  // IF it is a Direct Application -> Show Full Detail View
                  <ApplicationDetailView
                    key={selectedApp.id}
                    companyId={companyId}
                    applicationId={selectedApp.id}
                    onClosePanel={() => setSelectedApp(null)}
                    onStatusUpdate={() => refreshData(companyId)}
                    isCompanyAdmin={isCompanyAdmin} 
                    onPhoneClick={(e) => handlePhoneClick(e, selectedApp)}
                  />
               )
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-lg border border-gray-200 text-gray-400">
                <FileText size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">Select a driver to view details</p>
              </div>
            )}
          </div>

         </main>
      </div>

      {isAddUserModalOpen && <ManageTeamModal companyId={companyId} onClose={() => setIsAddUserModalOpen(false)} />}
      {isDriverSearchOpen && <DriverSearchModal onClose={() => setIsDriverSearchOpen(false)} />}
      {callModalData && <CallOutcomeModal lead={callModalData.lead} companyId={companyId} onClose={() => setCallModalData(null)} onUpdate={() => refreshData(companyId)} />}
      
      {isUploadModalOpen && (
          <CompanyBulkUpload 
            companyId={companyId}
            onClose={() => setIsUploadModalOpen(false)}
            onUploadComplete={() => refreshData(companyId)}
          />
      )}
    </>
  );
}