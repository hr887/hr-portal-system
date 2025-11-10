// src/components/admin/CreateView.jsx
import React, { useState } from 'react';
import { httpsCallable } from "firebase/functions";
import { functions } from '../../firebase/config.js';
import { createNewCompany } from '../../firebase/firestore.js';
import { Plus, UserPlus } from 'lucide-react';

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
      <div className="p-5">{children}</div>
    </div>
  );
}
// ---

// --- Reusable FormField Component ---
function FormField({ id, label, type = 'text', required = false, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        id={id}
        name={id}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        required={required}
        {...props}
      />
    </div>
  );
}
// ---

export function CreateView({ allCompaniesMap, onDataUpdate }) {
  // Forms State
  const [companyForm, setCompanyForm] = useState({
    name: '', slug: '', phone: '', email: '', street: '', city: '', state: '', zip: '', mc: '', dot: ''
  });
  const [companyFormLoading, setCompanyFormLoading] = useState(false);
  const [companyFormSuccess, setCompanyFormSuccess] = useState('');
  const [companyFormError, setCompanyFormError] = useState('');

  const [adminForm, setAdminForm] = useState({
    fullName: '', email: '', password: '', companyId: '', role: 'company_admin'
  });
  const [adminFormLoading, setAdminFormLoading] = useState(false);
  const [adminFormSuccess, setAdminFormSuccess] = useState('');
  const [adminFormError, setAdminFormError] = useState('');

  // --- Form Handlers ---
  const handleCompanyFormChange = (e) => {
    setCompanyForm(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };
  const handleAdminFormChange = (e) => {
    setAdminForm(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setCompanyFormLoading(true);
    setCompanyFormError('');
    setCompanyFormSuccess('');
    const companyData = {
      companyName: companyForm.name, appSlug: companyForm.slug.toLowerCase().trim(),
      address: { street: companyForm.street, city: companyForm.city, state: companyForm.state.toUpperCase(), zip: companyForm.zip },
      contact: { phone: companyForm.phone, email: companyForm.email },
      legal: { mcNumber: companyForm.mc, dotNumber: companyForm.dot },
      logoUrl: ""
    };
    try {
      await createNewCompany(companyData);
      setCompanyFormSuccess(`Successfully created ${companyData.companyName}!`);
      setCompanyForm({ name: '', slug: '', phone: '', email: '', street: '', city: '', state: '', zip: '', mc: '', dot: '' });
      onDataUpdate(); // Tell the parent to refresh all data
    } catch (error) { 
      setCompanyFormError(error.message); 
    } finally { 
      setCompanyFormLoading(false); 
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminFormLoading(true);
    setAdminFormError('');
    setAdminFormSuccess('');
    try {
      const createPortalUser = httpsCallable(functions, 'createPortalUser');
      const result = await createPortalUser({
        fullName: adminForm.fullName, email: adminForm.email, password: adminForm.password,
        companyId: adminForm.companyId, role: adminForm.role
      });
      setAdminFormSuccess(result.data.message);
      setAdminForm({ fullName: '', email: '', password: '', companyId: '', role: 'company_admin' });
      onDataUpdate(); // Tell the parent to refresh all data
    } catch (error) { 
      setAdminFormError(error.message); 
    } finally { 
      setAdminFormLoading(false); 
    }
  };

  return (
    <div className="space-y-8">
      <Card title="Create New Company" icon={<Plus size={22} />}>
        <form className="space-y-4" onSubmit={handleCreateCompany}>
          <FormField id="name" label="Company Name" required value={companyForm.name} onChange={handleCompanyFormChange} />
          <FormField id="slug" label="Unique URL Slug" required value={companyForm.slug} onChange={handleCompanyFormChange} />
          <FormField id="phone" label="Contact Phone" type="tel" value={companyForm.phone} onChange={handleCompanyFormChange} />
          <FormField id="email" label="Contact Email" type="email" value={companyForm.email} onChange={handleCompanyFormChange} />
          <FormField id="street" label="Street" value={companyForm.street} onChange={handleCompanyFormChange} />
          <FormField id="city" label="City" value={companyForm.city} onChange={handleCompanyFormChange} />
          <FormField id="state" label="State (e.g., IL)" value={companyForm.state} onChange={handleCompanyFormChange} maxLength="2" />
          <FormField id="zip" label="ZIP Code" value={companyForm.zip} onChange={handleCompanyFormChange} />
          <FormField id="mc" label="MC Number" value={companyForm.mc} onChange={handleCompanyFormChange} />
          <FormField id="dot" label="DOT Number" value={companyForm.dot} onChange={handleCompanyFormChange} />
          {companyFormSuccess && <p className="text-sm text-green-600">{companyFormSuccess}</p>}
          {companyFormError && <p className="text-sm text-red-600">{companyFormError}</p>}
          <button type="submit" className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg" disabled={companyFormLoading}>
            {companyFormLoading ? 'Creating...' : 'Create Company'}
          </button>
        </form>
      </Card>

      <Card title="Create New Company User" icon={<UserPlus size={22} />}>
        <form className="space-y-4" onSubmit={handleCreateAdmin}>
          <FormField id="fullName" label="Full Name" required value={adminForm.fullName} onChange={handleAdminFormChange} />
          <FormField id="email" label="Email Address" type="email" required value={adminForm.email} onChange={handleAdminFormChange} />
          <FormField id="password" label="Temporary Password" type="password" required value={adminForm.password} onChange={handleAdminFormChange} />
          <div>
            <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-1">Assign to Company</label>
            <select id="companyId" className="w-full p-3 border border-gray-300 rounded-lg bg-white" required value={adminForm.companyId} onChange={handleAdminFormChange}>
              <option value="">-- Select a company --</option>
              {Array.from(allCompaniesMap.entries()).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Select Role</label>
            <select id="role" className="w-full p-3 border border-gray-300 rounded-lg bg-white" required value={adminForm.role} onChange={handleAdminFormChange}>
              <option value="company_admin">Company Admin (Can manage)</option>
              <option value="hr_user">HR User (Can view)</option>
            </select>
          </div>
          {adminFormSuccess && <p className="text-sm text-green-600">{adminFormSuccess}</p>}
          {adminFormError && <p className="text-sm text-red-600">{adminFormError}</p>}
          <button type="submit" className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg" disabled={adminFormLoading}>
            {adminFormLoading ? 'Creating User...' : 'Create User'}
          </button>
        </form>
      </Card>
    </div>
  );
}
