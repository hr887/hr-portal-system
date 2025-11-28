// src/components/SuperAdminDashboard.jsx
import React, { useState } from 'react';
import { useData } from '../App.jsx';
import { db, functions } from '../firebase/config.js';
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from 'firebase/firestore';
import {
  LogOut,
  Building2,
  Search,
  X,
  Zap
} from 'lucide-react';

// --- Custom Hooks ---
import { useSuperAdminData } from '../hooks/useSuperAdminData';
import { useToast } from './feedback/ToastProvider';

// --- Components ---
import { SuperAdminSidebar } from './admin/SuperAdminSidebar.jsx'; 
import { DashboardView } from './admin/DashboardView.jsx';
import { CompaniesView } from './admin/CompaniesView.jsx';
import { UsersView } from './admin/UsersView.jsx';
import { CreateView } from './admin/CreateView.jsx';
import { GlobalSearchResults } from './admin/GlobalSearchResults.jsx';
import { ApplicationsView } from './admin/ApplicationsView.jsx';
import { BulkLeadAddingView } from './admin/BulkLeadAddingView.jsx';

// --- Modals ---
import { EditCompanyModal } from './modals/EditCompanyModal.jsx';
import { DeleteCompanyModal } from './modals/DeleteCompanyModal.jsx';
import { EditUserModal } from './modals/EditUserModal.jsx';
import { DeleteUserModal } from './modals/DeleteUserModal.jsx';
import { ViewCompanyAppsModal } from './modals/ViewCompanyAppsModal.jsx';
import { ApplicationDetailsModal } from './ApplicationDetailsModal.jsx';

export function SuperAdminDashboard() {
  const { handleLogout } = useData();
  const { showSuccess, showError, showInfo } = useToast();
  const [activeView, setActiveView] = useState('dashboard');

  // --- 1. Use Custom Hook for Data Logic ---
  const {
    companyList,
    userList,
    allApplications,
    allCompaniesMap,
    stats,
    loading: listLoading,
    statsError,
    searchQuery,
    setSearchQuery,
    searchResults,
    totalSearchResults,
    refreshData
  } = useSuperAdminData();

  // --- 2. Modal State ---
  const [editingCompanyDoc, setEditingCompanyDoc] = useState(null);
  const [deletingCompany, setDeletingCompany] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [viewingCompanyApps, setViewingCompanyApps] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const isSearching = searchQuery.length > 0;

  // --- 3. Handlers ---

  const onModalClose = () => {
    setEditingCompanyDoc(null);
    setDeletingCompany(null);
    setEditingUser(null);
    setDeletingUser(null);
    setViewingCompanyApps(null);
    setSelectedApplication(null);
  };

  const openEditCompany = async (companyId) => {
    try {
      const companyDoc = await getDoc(doc(db, 'companies', companyId));
      if (companyDoc.exists()) setEditingCompanyDoc(companyDoc);
    } catch (error) {
      console.error("Error opening edit company:", error);
      showError("Could not load company details.");
    }
  };

  const handleAppClick = (app) => {
    if (app.sourceType === 'General Lead' || app.sourceType === 'Added by Safehaul') {
      showInfo('This is a lead, not a full application. Details can be viewed in the table.');
      return;
    }
    setSelectedApplication({
      companyId: app.companyId,
      appId: app.id,
    });
  };

  const handleDistributeLeads = async () => {
    if(!window.confirm("Are you sure you want to distribute daily leads to ALL companies based on their plans (50/200)?")) return;
    
    showInfo("Distribution started. This may take a moment...");
    
    try {
        const distribute = httpsCallable(functions, 'distributeDailyLeads');
        const result = await distribute();
        
        // Show detailed success message
        if(result.data.details && result.data.details.length > 0) {
            console.log("Distribution Details:", result.data.details);
            showSuccess(`Success! ${result.data.message}`);
        } else {
            showSuccess(result.data.message);
        }
        
        refreshData(); // Refresh stats
    } catch (e) {
        console.error(e);
        showError("Error distributing leads: " + e.message);
    }
  };

  // --- 4. View Router ---
  const renderActiveView = () => {
    if (isSearching) {
      return (
        <GlobalSearchResults
          results={searchResults}
          totalResults={totalSearchResults}
          allCompaniesMap={allCompaniesMap}
          onViewApps={(company) => setViewingCompanyApps(company)}
          onEditCompany={(id) => openEditCompany(id)}
          onEditUser={(user) => setEditingUser(user)}
          onAppClick={(app) => handleAppClick(app)}
        />
      );
    }
    
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            stats={stats}
            statsLoading={listLoading}
            statsError={statsError}
          />
        );
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
      case 'applications':
        return (
          <ApplicationsView
            listLoading={listLoading}
            statsError={statsError}
            allApplications={allApplications}
            allCompaniesMap={allCompaniesMap}
            onAppClick={(app) => handleAppClick(app)}
          />
        );
      case 'bulk-lead-adding':
        return (
            <BulkLeadAddingView 
                onDataUpdate={refreshData} 
                onClose={() => setActiveView('dashboard')} // <-- FIX: Handles the close action
            />
        );
      case 'create':
        return (
          <CreateView
            allCompaniesMap={allCompaniesMap}
            onDataUpdate={refreshData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div id="super-admin-container" className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white shadow-md border-b border-gray-200">
          <div className="container mx-auto p-4 flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <Building2 size={24} />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Super Admin</h1>
            </div>

            <div className="relative flex-1 max-w-xl">
              <input
                type="text"
                placeholder="Global Search..."
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={20} />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleDistributeLeads}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                >
                    <Zap size={16} /> Distribute Leads
                </button>
            </div>

            <button
              id="logout-button-super"
              className="px-3 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all flex items-center gap-2 ml-2"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main Layout */}
        <div className="container mx-auto p-4 sm:p-8 flex gap-8 items-start">
          
          {/* Sidebar Component */}
          <SuperAdminSidebar 
            activeView={activeView}
            setActiveView={setActiveView}
            isSearching={isSearching}
            onClearSearch={() => setSearchQuery('')}
          />

          <main className="flex-1 w-full min-w-0">{renderActiveView()}</main>
        </div>
      </div>

      {/* --- Modals --- */}
      {editingCompanyDoc && (
        <EditCompanyModal
          companyDoc={editingCompanyDoc}
          onClose={onModalClose}
          onSave={refreshData}
        />
      )}
      {deletingCompany && (
        <DeleteCompanyModal
          companyId={deletingCompany.id}
          companyName={deletingCompany.name}
          onClose={onModalClose}
          onConfirm={refreshData}
        />
      )}
      {editingUser && (
        <EditUserModal
          userId={editingUser.id}
          allCompaniesMap={allCompaniesMap}
          onClose={onModalClose}
          onSave={refreshData}
        />
      )}
      {deletingUser && (
        <DeleteUserModal
          userId={deletingUser.id}
          userName={deletingUser.name}
          onClose={onModalClose}
          onConfirm={refreshData}
        />
      )}
      {viewingCompanyApps && (
        <ViewCompanyAppsModal
          companyId={viewingCompanyApps.id}
          companyName={viewingCompanyApps.name}
          onClose={onModalClose}
        />
      )}

      {selectedApplication && (
        <ApplicationDetailsModal
          companyId={selectedApplication.companyId}
          applicationId={selectedApplication.appId}
          onClose={onModalClose}
          onStatusUpdate={refreshData}
        />
      )}
    </>
  );
}