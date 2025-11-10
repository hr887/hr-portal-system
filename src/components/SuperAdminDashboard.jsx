// src/components/SuperAdminDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../App.jsx';
import { httpsCallable } from "firebase/functions";
import { functions, db } from '../firebase/config.js';
import { doc, getDoc, collectionGroup, getDocs } from "firebase/firestore";
import { 
  loadCompanies,
  createNewCompany,
  loadAllUsers,
  loadAllMemberships
} from '../firebase/firestore.js';
import { LogOut, Plus, Building, Users, Briefcase, Trash2, Edit2, AlertTriangle, LayoutDashboard, FileText, Building2, Search, X } from 'lucide-react';

// --- NEW: Import all our "View" components ---
import { DashboardView } from './admin/DashboardView.jsx';
import { CompaniesView } from './admin/CompaniesView.jsx';
import { UsersView } from './admin/UsersView.jsx';
import { CreateView } from './admin/CreateView.jsx';
import { GlobalSearchResults } from './admin/GlobalSearchResults.jsx';
import { ApplicationsView } from './admin/ApplicationsView.jsx'; // <-- NEW IMPORT

// Import Modals
import { EditCompanyModal } from './modals/EditCompanyModal.jsx';
import { DeleteCompanyModal } from './modals/DeleteCompanyModal.jsx';
import { EditUserModal } from './modals/EditUserModal.jsx';
import { DeleteUserModal } from './modals/DeleteUserModal.jsx';
import { ViewCompanyAppsModal } from './modals/ViewCompanyAppsModal.jsx';
import { ApplicationDetailsModal } from './ApplicationDetailsModal.jsx'; // <-- NEW IMPORT


// --- Reusable NavItem Component ---
function NavItem({ label, icon, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left font-medium
        ${isActive 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-gray-700 hover:bg-gray-100'
        }
        transition-all
      `}
    >
      {icon}
      {label}
    </button>
  );
}
// ---

export function SuperAdminDashboard() {
  const { handleLogout } = useData();

  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'companies', 'users', 'applications', 'create'

  // Modal State
  const [editingCompanyDoc, setEditingCompanyDoc] = useState(null);
  const [deletingCompany, setDeletingCompany] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [viewingCompanyApps, setViewingCompanyApps] = useState(null); // { id, name }
  // --- NEW: State for opening the main application modal ---
  const [selectedApplication, setSelectedApplication] = useState(null); // { companyId, appId }

  // Global Data State
  const [companyList, setCompanyList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [allCompaniesMap, setAllCompaniesMap] = useState(new Map());
  const [listLoading, setListLoading] = useState(true);
  
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const isSearching = globalSearchQuery.length > 0;

  // Stats State
  const [stats, setStats] = useState({ companyCount: 0, userCount: 0, appCount: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState({ companies: false, users: false, apps: false });

  // --- Data Loading (Resilient) ---
  async function loadAllData() {
    setListLoading(true);
    setStatsLoading(true);
    setStatsError({ companies: false, users: false, apps: false });

    let companyCount = 0;
    let userCount = 0;
    let appCount = 0;

    // Load Companies
    try {
      const companiesSnap = await loadCompanies();
      const companies = [];
      const companyMap = new Map();
      companiesSnap.forEach(doc => {
        companies.push({ id: doc.id, ...doc.data() });
        companyMap.set(doc.id, doc.data().companyName);
      });
      setCompanyList(companies);
      setAllCompaniesMap(companyMap);
      companyCount = companies.length;
    } catch (error) {
      console.error("Firebase permission error (Companies):", error);
      setStatsError(prev => ({ ...prev, companies: true }));
      setCompanyList([]);
    }

    // Load Users & Memberships
    try {
      const [usersSnap, membershipsSnap] = await Promise.all([
        loadAllUsers(),
        loadAllMemberships()
      ]);

      const membershipsMap = new Map();
      membershipsSnap.forEach(doc => {
        const membership = doc.data();
        if (!membershipsMap.has(membership.userId)) {
          membershipsMap.set(membership.userId, []);
        }
        membershipsMap.get(membership.userId).push(membership);
      });
      const users = usersSnap.docs.map(userDoc => ({
        id: userDoc.id,
        ...userDoc.data(),
        memberships: membershipsMap.get(userDoc.id) || []
      }));
      setUserList(users);
      userCount = users.length;
    } catch (error) {
      console.error("Firebase permission error (Users/Memberships):", error);
      setStatsError(prev => ({ ...prev, users: true }));
      setUserList([]);
    }
    
    // Load Applications (Collection Group)
    try {
      const appSnap = await getDocs(collectionGroup(db, 'applications'));
      const applications = appSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        companyId: doc.ref.parent.parent.id 
      }));
      setAllApplications(applications);
      appCount = applications.length;
    } catch (error) {
      console.error("Firebase permission error (Applications CollectionGroup):", error);
      setStatsError(prev => ({ ...prev, apps: true }));
      setAllApplications([]);
    }
    
    // Finalize State
    setStats({
      companyCount: companyCount,
      userCount: userCount,
      appCount: appCount
    });
    setListLoading(false);
    setStatsLoading(false);
  }

  useEffect(() => {
    loadAllData();
  }, []);
  
  // --- Global Search Logic ---
  const globalFilteredResults = useMemo(() => {
    const searchTerm = globalSearchQuery.toLowerCase();
    if (!searchTerm) {
      return { companies: [], users: [], applications: [] };
    }
    
    const filteredCompanies = companyList.filter(company => {
      return (company.companyName?.toLowerCase().includes(searchTerm) ||
              company.appSlug?.toLowerCase().includes(searchTerm) ||
              company.id.toLowerCase().includes(searchTerm));
    });
    
    const filteredUsers = userList.filter(user => {
      return (user.name?.toLowerCase().includes(searchTerm) ||
              user.email?.toLowerCase().includes(searchTerm));
    });
    
    const filteredApplications = allApplications.filter(app => {
      const name = `${app['firstName'] || ''} ${app['lastName'] || ''}`.toLowerCase(); // Use camelCase
      return (name.includes(searchTerm) ||
              app.email?.toLowerCase().includes(searchTerm) ||
              app['cdlNumber']?.toLowerCase().includes(searchTerm)); // Use camelCase
    });

    return { 
      companies: filteredCompanies, 
      users: filteredUsers, 
      applications: filteredApplications
    };
  }, [globalSearchQuery, companyList, userList, allApplications]);
  
  const totalResults = globalFilteredResults.companies.length + globalFilteredResults.users.length + globalFilteredResults.applications.length;

  // --- Modal Handlers ---
  const openEditCompany = async (companyId) => {
    const companyDoc = await getDoc(doc(db, "companies", companyId));
    if (companyDoc.exists()) setEditingCompanyDoc(companyDoc);
  };
  const onModalClose = () => {
    setEditingCompanyDoc(null);
    setDeletingCompany(null);
    setEditingUser(null);
    setDeletingUser(null);
    setViewingCompanyApps(null);
    setSelectedApplication(null); // <-- NEW: Close app modal
  };
  const refreshAll = () => loadAllData();

  // --- NEW: Render Logic ---
  const renderActiveView = () => {
    if (isSearching) {
      return (
        <GlobalSearchResults
          results={globalFilteredResults}
          totalResults={totalResults}
          allCompaniesMap={allCompaniesMap}
          onViewApps={(company) => setViewingCompanyApps(company)}
          onEditCompany={(id) => openEditCompany(id)}
          onEditUser={(user) => setEditingUser(user)}
          // --- NEW: Wire up app click ---
          onAppClick={(companyId, appId) => setSelectedApplication({ companyId, appId })}
        />
      );
    }
    switch (activeView) {
      case 'dashboard':
        return <DashboardView stats={stats} statsLoading={statsLoading} statsError={statsError} />;
      case 'companies':
        return (
          <CompaniesView
            listLoading={listLoading}
            statsError={statsError}
            companyList={companyList}
            onViewApps={(company) => setViewingCompanyApps(company)}
            onEdit={(id) => openEditCompany(id)}
            onDelete={(company) => setDeletingCompany(company)}
          />
        );
      case 'users':
        return (
          <UsersView
            listLoading={listLoading}
            statsError={statsError}
            userList={userList}
            allCompaniesMap={allCompaniesMap}
            onEdit={(user) => setEditingUser(user)}
            onDelete={(user) => setDeletingUser(user)}
          />
        );
      // --- NEW: Add Applications page ---
      case 'applications':
        return (
          <ApplicationsView
            listLoading={listLoading}
            statsError={statsError}
            allApplications={allApplications}
            allCompaniesMap={allCompaniesMap}
            onAppClick={(companyId, appId) => setSelectedApplication({ companyId, appId })}
          />
        );
      case 'create':
        return <CreateView allCompaniesMap={allCompaniesMap} onDataUpdate={refreshAll} />;
      default:
        return <DashboardView stats={stats} statsLoading={statsLoading} statsError={statsError} />;
    }
  };
  // --- End Render Logic ---

  return (
    <>
      <div id="super-admin-container" className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 bg-white shadow-md border-b border-gray-200">
          <div className="container mx-auto p-4 flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white">
                <Building2 size={24} />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">
                Super Admin
              </h1>
            </div>
            
            <div className="relative flex-1 max-w-xl">
              <input
                type="text"
                placeholder="Global Search (Companies, Users, Drivers)..."
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
              />
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              {globalSearchQuery && (
                <button 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setGlobalSearchQuery('')}
                >
                  <X size={20} />
                </button>
              )}
            </div>
            
            <button
              id="logout-button-super"
              className="px-3 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all flex items-center gap-2"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <div className="container mx-auto p-4 sm:p-8 flex gap-8 items-start">
          <nav className="w-full sm:w-64 shrink-0 bg-white p-4 rounded-xl shadow-lg border border-gray-200 space-y-2 sticky top-24">
            <NavItem 
              label="Dashboard" 
              icon={<LayoutDashboard size={20} />} 
              isActive={activeView === 'dashboard' && !isSearching} 
              onClick={() => { setActiveView('dashboard'); setGlobalSearchQuery(''); }}
            />
            <NavItem 
              label="Companies" 
              icon={<Building size={20} />} 
              isActive={activeView === 'companies' && !isSearching} 
              onClick={() => { setActiveView('companies'); setGlobalSearchQuery(''); }}
            />
            <NavItem 
              label="Users" 
              icon={<Users size={20} />} 
              isActive={activeView === 'users' && !isSearching} 
              onClick={() => { setActiveView('users'); setGlobalSearchQuery(''); }}
            />
            {/* --- NEW: Add Applications Nav Item --- */}
            <NavItem 
              label="Driver Applications" 
              icon={<FileText size={20} />} 
              isActive={activeView === 'applications' && !isSearching} 
              onClick={() => { setActiveView('applications'); setGlobalSearchQuery(''); }}
            />
            <NavItem 
              label="Create New" 
              icon={<Plus size={20} />} 
              isActive={activeView === 'create' && !isSearching} 
              onClick={() => { setActiveView('create'); setGlobalSearchQuery(''); }}
            />
          </nav>

          <main className="flex-1 w-full min-w-0">
            {renderActiveView()}
          </main>
        </div>
      </div>

      {/* --- Modals --- */}
      {editingCompanyDoc && (
        <EditCompanyModal companyDoc={editingCompanyDoc} onClose={onModalClose} onSave={refreshAll} />
      )}
      {deletingCompany && (
        <DeleteCompanyModal companyId={deletingCompany.id} companyName={deletingCompany.name} onClose={onModalClose} onConfirm={refreshAll} />
      )}
      {editingUser && (
        <EditUserModal userId={editingUser.id} allCompaniesMap={allCompaniesMap} onClose={onModalClose} onSave={refreshAll} />
      )}
      {deletingUser && (
        <DeleteUserModal userId={deletingUser.id} userName={deletingUser.name} onClose={onModalClose} onConfirm={refreshAll} />
      )}
      {viewingCompanyApps && (
        <ViewCompanyAppsModal companyId={viewingCompanyApps.id} companyName={viewingCompanyApps.name} onClose={onModalClose} />
      )}
      {/* --- NEW: Wire up main Application Modal --- */}
      {selectedApplication && (
        <ApplicationDetailsModal
          companyId={selectedApplication.companyId}
          applicationId={selectedApplication.appId}
          onClose={onModalClose}
          onStatusUpdate={refreshAll}
        />
      )}
    </>
  );
}