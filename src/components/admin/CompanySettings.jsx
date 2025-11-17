// src/components/admin/CompanySettings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- Added hook for navigation
import { useData } from '../../App.jsx';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from '../../firebase/config.js'; 
import { 
  Building, User, Facebook, CreditCard, Save, Loader2, 
  CheckCircle, FileSignature, Blocks, ShieldCheck, Upload, Plus, ArrowLeft
} from 'lucide-react';

// --- SUB-COMPONENT: SIDEBAR ITEM ---
const SidebarItem = ({ id, label, icon: Icon, activeTab, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-medium transition-all duration-200 ${
      activeTab === id 
        ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
        : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900'
    }`}
  >
    <Icon size={20} className={activeTab === id ? "text-blue-600" : "text-gray-400"} />
    {label}
  </button>
);

// --- SUB-COMPONENT: INTEGRATION CARD ---
const IntegrationCard = ({ icon: Icon, title, description, status, onConfigure, comingSoon }) => (
  <div className="border border-gray-200 rounded-xl p-5 flex items-start gap-4 hover:border-blue-300 transition-all bg-white">
    <div className={`p-3 rounded-lg shrink-0 ${status === 'connected' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
      <Icon size={24} />
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-start">
        <h4 className="font-bold text-gray-900">{title}</h4>
        {status === 'connected' && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Active</span>}
        {comingSoon && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">Soon</span>}
      </div>
      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>
      {!comingSoon && (
        <button 
          onClick={onConfigure}
          className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          Configure Integration &rarr;
        </button>
      )}
    </div>
  </div>
);

export function CompanySettings() {
  const { currentCompanyProfile, currentUserClaims, currentUser } = useData();
  const [activeTab, setActiveTab] = useState('company'); 
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate(); // <-- Hook for navigation

  // Form States
  const [compData, setCompData] = useState({});
  const [personalData, setPersonalData] = useState({ name: '' });
  const [logoUploading, setLogoUploading] = useState(false);

  // Initial Data Load
  useEffect(() => {
    if (currentCompanyProfile) {
      setCompData({
        companyName: currentCompanyProfile.companyName || '',
        phone: currentCompanyProfile.contact?.phone || '',
        email: currentCompanyProfile.contact?.email || '',
        street: currentCompanyProfile.address?.street || '',
        city: currentCompanyProfile.address?.city || '',
        state: currentCompanyProfile.address?.state || '',
        zip: currentCompanyProfile.address?.zip || '',
        mcNumber: currentCompanyProfile.legal?.mcNumber || '',
        dotNumber: currentCompanyProfile.legal?.dotNumber || '',
        facebookPageId: currentCompanyProfile.integrations?.facebookPageId || '',
        companyLogoUrl: currentCompanyProfile.companyLogoUrl || ''
      });
    }
    if (currentUser) {
        const fetchUser = async () => {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if(userDoc.exists()) {
                setPersonalData({ name: userDoc.data().name || '' });
            }
        }
        fetchUser();
    }
  }, [currentCompanyProfile, currentUser]);

  // --- SAVE HANDLERS ---

  const handleSaveCompany = async () => {
    setLoading(true);
    setSuccessMsg('');
    try {
      const companyRef = doc(db, "companies", currentCompanyProfile.id);
      await updateDoc(companyRef, {
        companyName: compData.companyName,
        contact: { phone: compData.phone, email: compData.email },
        address: { 
            street: compData.street, 
            city: compData.city, 
            state: compData.state, 
            zip: compData.zip 
        },
        legal: { mcNumber: compData.mcNumber, dotNumber: compData.dotNumber },
        "integrations.facebookPageId": compData.facebookPageId 
      });
      setSuccessMsg('Company settings saved.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error("Save failed", error);
      alert("Failed to save settings. Check permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePersonal = async () => {
      setLoading(true);
      setSuccessMsg('');
      try {
          const userRef = doc(db, "users", currentUser.uid);
          await updateDoc(userRef, {
              name: personalData.name
          });
          setSuccessMsg('Personal profile updated.');
          setTimeout(() => setSuccessMsg(''), 3000);
      } catch (error) {
          console.error("User save failed", error);
          alert("Failed to save personal profile.");
      } finally {
          setLoading(false);
      }
  };

  const handleLogoUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setLogoUploading(true);
      try {
          const storagePath = `company_assets/${currentCompanyProfile.id}/logo_${Date.now()}.png`;
          const fileRef = ref(storage, storagePath); 
          
          await uploadBytes(fileRef, file);
          const downloadURL = await getDownloadURL(fileRef);

          const companyRef = doc(db, "companies", currentCompanyProfile.id);
          await updateDoc(companyRef, { companyLogoUrl: downloadURL });
          
          setCompData(prev => ({ ...prev, companyLogoUrl: downloadURL }));
          setSuccessMsg("Logo uploaded successfully!");
          setTimeout(() => setSuccessMsg(''), 3000);

      } catch (error) {
          console.error("Logo upload failed", error);
          alert("Failed to upload logo: " + error.message);
      } finally {
          setLogoUploading(false);
      }
  };

  // --- RENDER CONTENT BASED ON TAB ---
  const renderContent = () => {
    switch (activeTab) {
      case 'company':
        return (
          <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-2xl font-bold text-gray-900">Company Profile</h2>
              <p className="text-gray-500 mt-1">Manage your official company details and contact information.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Section */}
              <div className="md:col-span-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center relative">
                  <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 overflow-hidden border border-gray-200">
                      {compData.companyLogoUrl ? (
                          <img src={compData.companyLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                          <Building className="text-gray-400" size={32} />
                      )}
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900">Company Logo</h4>
                  <p className="text-xs text-gray-500 mb-4">Used on your branded application page</p>
                  
                  <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                      {logoUploading ? 'Uploading...' : 'Upload New Logo'}
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={logoUploading} />
                  </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                <input type="text" value={compData.companyName} onChange={(e) => setCompData({...compData, companyName: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">MC Number / DOT</label>
                <input type="text" value={compData.mcNumber} onChange={(e) => setCompData({...compData, mcNumber: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Public Contact Email</label>
                <input type="email" value={compData.email} onChange={(e) => setCompData({...compData, email: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Public Phone Number</label>
                <input type="text" value={compData.phone} onChange={(e) => setCompData({...compData, phone: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="md:col-span-2">
                 <label className="block text-sm font-semibold text-gray-700 mb-2">Headquarters Address</label>
                 <input type="text" placeholder="Street Address" value={compData.street} onChange={(e) => setCompData({...compData, street: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500" />
                 <div className="grid grid-cols-3 gap-3">
                    <input type="text" placeholder="City" value={compData.city} onChange={(e) => setCompData({...compData, city: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    <input type="text" placeholder="State" value={compData.state} onChange={(e) => setCompData({...compData, state: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    <input type="text" placeholder="ZIP" value={compData.zip} onChange={(e) => setCompData({...compData, zip: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                 </div>
              </div>
            </div>
            <div className="pt-6 flex justify-end border-t border-gray-100">
               <button onClick={handleSaveCompany} disabled={loading} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all">
                 {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                 Save Changes
               </button>
            </div>
          </div>
        );

      case 'personal':
        return (
          <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-2xl font-bold text-gray-800">Personal Profile</h2>
              <p className="text-gray-500 mt-1">Manage your admin account details.</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                    <input 
                        type="text" 
                        value={personalData.name} 
                        onChange={(e) => setPersonalData({...personalData, name: e.target.value})} 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email (Read Only)</label>
                    <input 
                        type="text" 
                        value={currentUser?.email || ''} 
                        readOnly
                        className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" 
                    />
                </div>
                
                <div className="flex justify-end pt-4">
                     <button onClick={handleSavePersonal} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                        Update Profile
                    </button>
                </div>
            </div>

            <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
              <strong>Security Note:</strong> To change your password, please log out and use the "Forgot Password" link on the login screen.
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-8 max-w-5xl animate-in fade-in duration-300">
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Blocks className="text-blue-600" /> Integrations & API
              </h2>
              <p className="text-gray-500 mt-1">Connect your recruiting pipeline with external services.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Active Integration: Facebook */}
               <div className="md:col-span-2">
                 <IntegrationCard 
                    icon={Facebook} 
                    title="Facebook Lead Ads" 
                    description="Automatically import driver leads from your Facebook & Instagram campaigns directly into your dashboard."
                    status={compData.facebookPageId ? 'connected' : 'disconnected'}
                    onConfigure={() => document.getElementById('fb-config').scrollIntoView({behavior: 'smooth'})}
                 />
               </div>
               
               {/* Coming Soon Integrations */}
               <IntegrationCard icon={ShieldCheck} title="Asurint Backgrounds" description="Run criminal and MVR checks with one click." comingSoon />
               <IntegrationCard icon={Blocks} title="FMCSA PSP" description="Instant Pre-Employment Screening Program reports." comingSoon />
               <IntegrationCard icon={Blocks} title="DACH Clearinghouse" description="Drug & Alcohol Clearinghouse query automation." comingSoon />
            </div>
            
            {/* Configuration Area for Facebook */}
            <div id="fb-config" className="bg-gray-50 border border-gray-200 rounded-xl p-8 mt-8">
               <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Facebook size={20} /> Configure Facebook</h3>
               <div className="max-w-md space-y-4">
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Facebook Page ID</label>
                      <input 
                        type="text" 
                        placeholder="e.g., 1029384756" 
                        value={compData.facebookPageId || ''}
                        onChange={(e) => setCompData({...compData, facebookPageId: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                      />
                      <p className="text-xs text-gray-500 mt-2">Found in your Facebook Page Settings &gt; About.</p>
                  </div>
                  <button onClick={handleSaveCompany} disabled={loading} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                     {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                     Save Integration
                  </button>
               </div>
            </div>
          </div>
        );

      case 'eforms':
        return (
          <div className="space-y-8 max-w-5xl animate-in fade-in duration-300">
             <div className="border-b border-gray-200 pb-6 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FileSignature className="text-blue-600" /> E-Signature Templates
                </h2>
                <p className="text-gray-500 mt-1">Manage documents, offer letters, and onboarding forms.</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus size={16} /> Create Template
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Standard Form Card */}
                <div className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-all cursor-pointer group">
                    <div className="h-32 bg-gray-100 rounded-lg mb-4 flex items-center justify-center border border-dashed border-gray-300">
                        <FileSignature className="text-gray-400 group-hover:text-blue-500 transition-colors" size={40} />
                    </div>
                    <h4 className="font-bold text-gray-900">General Employment App</h4>
                    <p className="text-xs text-gray-500 mt-1">Standard 9-step DOT application.</p>
                    <div className="mt-4 flex justify-between items-center">
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Default</span>
                        <button className="text-blue-600 hover:underline text-xs font-bold">Preview</button>
                    </div>
                </div>

                {/* Placeholder for Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center justify-center text-center h-full min-h-[200px]">
                    <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                        <Upload className="text-blue-600" size={24} />
                    </div>
                    <h4 className="font-bold text-gray-900">Upload Custom PDF</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Upload your own PDF to add signature placeholders (Drag & Drop).</p>
                </div>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="flex flex-col items-center justify-center h-96 text-center p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
             <div className="bg-white p-5 rounded-full mb-6 shadow-sm">
                <CreditCard size={40} className="text-gray-400" />
             </div>
             <h3 className="text-2xl font-bold text-gray-900">Billing Portal</h3>
             <p className="text-gray-500 mt-2 max-w-md">
                 Manage your subscription, view invoices, and update payment methods. This module is currently being integrated with Stripe.
             </p>
             <button className="mt-6 px-6 py-2 bg-gray-200 text-gray-500 font-semibold rounded-lg cursor-not-allowed">
                 Manage Subscription
             </button>
          </div>
        );
        
      default: return null;
    }
  };

  if (!currentCompanyProfile) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
       {/* Top Nav Placeholder (Visual consistency) */}
       <div className="h-16 bg-white border-b border-gray-200 mb-8 flex items-center px-8">
          <button onClick={() => navigate('/company/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
             <ArrowLeft size={20} /> Back to Dashboard
          </button>
       </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Sidebar */}
          <aside className="w-full md:w-72 flex-shrink-0">
             <div className="sticky top-24 space-y-1">
                 <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Settings</h3>
                 <SidebarItem id="company" label="Company Profile" icon={Building} activeTab={activeTab} onClick={setActiveTab} />
                 <SidebarItem id="personal" label="Personal Profile" icon={User} activeTab={activeTab} onClick={setActiveTab} />
                 
                 <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-2">Modules</h3>
                 <SidebarItem id="integrations" label="Integrations" icon={Blocks} activeTab={activeTab} onClick={setActiveTab} />
                 <SidebarItem id="eforms" label="E-Signature Docs" icon={FileSignature} activeTab={activeTab} onClick={setActiveTab} />
                 
                 <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-2">Account</h3>
                 <SidebarItem id="billing" label="Billing & Plan" icon={CreditCard} activeTab={activeTab} onClick={setActiveTab} />
             </div>
          </aside>

          {/* Right Content Area */}
          <main className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 min-h-[600px] relative">
            {successMsg && (
               <div className="absolute top-6 right-8 animate-in slide-in-from-top-2 fade-in duration-300">
                   <div className="px-4 py-3 bg-green-100 text-green-800 rounded-lg flex items-center gap-2 shadow-sm border border-green-200 text-sm font-bold">
                      <CheckCircle size={16} /> {successMsg}
                   </div>
               </div>
            )}
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}