// src/components/CompanyAdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
// UPDATED: Import from new context file
import { useData } from '../context/DataContext';
import { auth } from '../firebase/config.js';
import { getPortalUser } from '../firebase/firestore.js'; 
import { useToast } from './feedback/ToastProvider';

// --- CUSTOM HOOKS & COMPONENTS ---
import { useCompanyDashboard } from '../hooks/useCompanyDashboard';
import { DashboardTable } from './company/DashboardTable'; 
import { StatCard } from './company/StatCard.jsx';

import { DriverSearchModal } from './admin/DriverSearchModal.jsx';
import { NotificationBell } from './feedback/NotificationBell.jsx'; 
import { CallOutcomeModal } from './modals/CallOutcomeModal.jsx'; 
import { CompanyBulkUpload } from './CompanyBulkUpload.jsx';
import { PerformanceWidget } from './admin/PerformanceWidget.jsx'; 
import { ApplicationDetailView } from './ApplicationDetailView.jsx';
import { 
  LogOut, Search, FileText, Settings, Zap, Briefcase, 
  Upload, Replace, Users
} from 'lucide-react';

export function CompanyAdminDashboard() {
  const { currentCompanyProfile, handleLogout, returnToCompanyChooser, currentUserClaims } = useData();
  const { showError } = useToast();
  const navigate = useNavigate();
  const companyId = currentCompanyProfile?.id;
  const companyName = currentCompanyProfile?.companyName;

  // Check Admin Permission
  const isCompanyAdmin = currentUserClaims?.roles?.[companyId] === 'company_admin' 
                         || currentUserClaims?.roles?.globalRole === 'super_admin';

  const dashboard = useCompanyDashboard(companyId);

  const [userName, setUserName] = useState('Admin User');
  const [userEmail, setUserEmail] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const [selectedApp, setSelectedApp] = useState(null);
  const [isDriverSearchOpen, setIsDriverSearchOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [callModalData, setCallModalData] = useState(null); 

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

  const handlePhoneClick = (e, item) => {
      if(e) e.stopPropagation();
      if(item && item.phone) {
          window.location.href = `tel:${item.phone}`;
          setCallModalData({ lead: item });
      } else {
          showError("No phone number available for this driver.");
      }
  };

  return (
    <>
      <div id="company-admin-container" className="h-screen bg-gray-50 flex flex-col font-sans">
        
        {/* --- HEADER --- */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shrink-0 px-6 py-3 shadow-sm">
          <div className="flex justify-between items-center max-w-[1600px] mx-auto w-full">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-blue-200 shadow-lg">
                  {companyName ? companyName.charAt(0) : "C"}
               </div>
               <div>
                 <h1 className="text-lg font-bold text-gray-900 leading-tight">{companyName || "Company Dashboard"}</h1>
                 <p className="text-xs text-gray-500 font-medium">Recruiter Workspace</p>
               </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Only Show Import if Admin */}
                {isCompanyAdmin && (
                    <button 
                        onClick={() => setIsUploadModalOpen(true)}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                    >
                        <Upload size={16} /> Import Leads
                    </button>
                )}

                <button onClick={() => setIsDriverSearchOpen(true)} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
                    <Search size={16} /> Search DB
                </button>
                
                <div className="h-8 w-px bg-gray-200 mx-1"></div>

                <NotificationBell userId={auth.currentUser?.uid} />

                <div className="relative ml-2">
                    <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 focus:outline-none">
                        <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm hover:bg-gray-200 transition">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                    </button>
                    {isUserMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100" onClick={() => setIsUserMenuOpen(false)}>
                            <div className="p-3 border-b border-gray-100 bg-gray-50">
                                <p className="text-sm font-bold text-gray-900 truncate">{userName}</p>
                                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                            </div>
                            <nav className="p-1">
                                <button onClick={() => navigate('/company/settings')} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"><Settings size={16} /> Settings</button>
                                <button onClick={returnToCompanyChooser} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"><Replace size={16} /> Switch Company</button>
                                <div className="h-px bg-gray-100 my-1"></div>
                                <button onClick={handleLogout} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"><LogOut size={16} /> Logout</button>
                            </nav>
                        </div>
                    )}
                </div>
              </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col max-w-[1600px] mx-auto w-full p-4 sm:p-6">
        
             {/* --- STATS ROW --- */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6 shrink-0">
                 <StatCard 
                    title="Applications" 
                    value={dashboard.applications.length} 
                    icon={<FileText size={20}/>} 
                    active={dashboard.activeTab === 'applications'}
                    colorClass="ring-blue-500 bg-blue-500"
                    onClick={() => dashboard.setActiveTab('applications')}
                 />
               <StatCard 
                    title="SafeHaul Leads" 
                    value={dashboard.platformLeads.length} 
                    icon={<Zap size={20}/>} 
                    active={dashboard.activeTab === 'find_driver'}
                    colorClass="ring-purple-500 bg-purple-500"
                    onClick={() => dashboard.setActiveTab('find_driver')}
                />
                <StatCard 
                    title="Company Leads" 
                    value={dashboard.companyLeads.length} 
                    icon={<Briefcase size={20}/>} 
                    active={dashboard.activeTab === 'company_leads'}
                    colorClass="ring-orange-500 bg-orange-500"
                    onClick={() => dashboard.setActiveTab('company_leads')}
                />
                <StatCard 
                    title="My Leads" 
                    value={dashboard.myLeads.length} 
                    icon={<User size={20}/>} 
                    active={dashboard.activeTab === 'my_leads'}
                    colorClass="ring-green-500 bg-green-500"
                    onClick={() => dashboard.setActiveTab('my_leads')}
                />
                  
                 {/* Leaderboard Widget */}
                 <div className="lg:col-span-1">
                     <PerformanceWidget companyId={companyId} />
                 </div>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white rounded-xl shadow-sm border border-gray-200">
                
                <DashboardTable 
                    activeTab={dashboard.activeTab}
                    loading={dashboard.loading}
                    data={dashboard.paginatedData}
                    totalCount={dashboard.filteredList.length}
                    selectedId={selectedApp?.id}
                    
                    onSelect={setSelectedApp}
                    onPhoneClick={handlePhoneClick}
                    
                    searchQuery={dashboard.searchQuery}
                    setSearchQuery={dashboard.setSearchQuery}
                    
                    // --- FILTERS ---
                    filters={dashboard.filters}
                    setFilters={dashboard.setFilters}

                    currentPage={dashboard.currentPage}
                    setCurrentPage={dashboard.setCurrentPage}
                    itemsPerPage={dashboard.itemsPerPage}
                    setItemsPerPage={dashboard.setItemsPerPage}
                    totalPages={dashboard.totalPages}
                />
            </div>
        </div>
      </div>

      {/* Unified Detail View Modal */}
      {selectedApp && (
         <ApplicationDetailView
            key={selectedApp.id}
            companyId={companyId}
            applicationId={selectedApp.id}
            onClosePanel={() => setSelectedApp(null)}
            onStatusUpdate={dashboard.refreshData}
            isCompanyAdmin={isCompanyAdmin}
            onPhoneClick={(e) => handlePhoneClick(e, selectedApp)}
         />
      )}

      {isDriverSearchOpen && <DriverSearchModal onClose={() => setIsDriverSearchOpen(false)} />}
      
      {callModalData && <CallOutcomeModal lead={callModalData.lead} companyId={companyId} onClose={() => setCallModalData(null)} onUpdate={dashboard.refreshData} />}
      
      {isUploadModalOpen && isCompanyAdmin && (
           <CompanyBulkUpload 
            companyId={companyId}
            onClose={() => setIsUploadModalOpen(false)}
            onUploadComplete={dashboard.refreshData}
          />
      )}
    </>
  );
}

// Helper icons
function User({size}) {
    return <Users size={size} />
}