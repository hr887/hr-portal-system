// src/components/admin/CompanySettings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../App.jsx';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from '../../firebase/config.js'; 
import { 
  Building, User, CreditCard, Save, Loader2, 
  CheckCircle, FileSignature, Blocks, Upload, ArrowLeft, 
  DollarSign, Clock, UserPlus // <-- Added UserPlus
} from 'lucide-react';
import { ManageTeamModal } from '../ManageTeamModal.jsx'; // <-- Import the Modal

// --- CONFIG: Standard Options ---
const HOME_TIME_OPTIONS = ["Daily", "Weekends", "Weekly", "Bi-Weekly", "Monthly", "OTR"];
const BENEFIT_OPTIONS = ["Health Insurance", "Dental", "401k", "Sign-on Bonus", "Pet Policy", "Rider Policy", "New Equipment"];

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

// --- HELPER: Structured Offer Form ---
const StructuredOfferForm = ({ id, label, checked, offerData, onCheckChange, onDataChange }) => {
    const data = offerData || { cpm: '', homeTime: 'Weekly', benefits: [] };

    const toggleBenefit = (benefit) => {
        const current = data.benefits || [];
        const updated = current.includes(benefit) 
            ? current.filter(b => b !== benefit)
            : [...current, benefit];
        onDataChange({ ...data, benefits: updated });
    };

    return (
        <div className={`border rounded-lg p-4 transition-all ${checked ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 bg-white'}`}>
            <label className="flex items-center gap-3 cursor-pointer mb-2">
                <input type="checkbox" id={id} checked={checked || false} onChange={onCheckChange} className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                <span className={`font-bold ${checked ? 'text-blue-800' : 'text-gray-700'}`}>{label}</span>
            </label>
            
            {checked && (
                <div className="pl-8 mt-3 space-y-3 animate-in fade-in slide-in-from-top-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pay (CPM / %)</label>
                            <div className="relative">
                                <DollarSign size={14} className="absolute left-2 top-2.5 text-gray-400"/>
                                <input 
                                    type="text" 
                                    placeholder="0.65" 
                                    value={data.cpm || ''}
                                    onChange={(e) => onDataChange({...data, cpm: e.target.value})}
                                    className="w-full pl-7 p-2 text-sm border border-gray-300 rounded-md bg-white"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Home Time</label>
                            <div className="relative">
                                <Clock size={14} className="absolute left-2 top-2.5 text-gray-400"/>
                                <select 
                                    value={data.homeTime || 'Weekly'}
                                    onChange={(e) => onDataChange({...data, homeTime: e.target.value})}
                                    className="w-full pl-7 p-2 text-sm border border-gray-300 rounded-md bg-white"
                                >
                                    {HOME_TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Benefits & Perks</label>
                        <div className="flex flex-wrap gap-2">
                            {BENEFIT_OPTIONS.map(ben => (
                                <button
                                    key={ben}
                                    type="button"
                                    onClick={() => toggleBenefit(ben)}
                                    className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                                        data.benefits?.includes(ben) 
                                        ? 'bg-blue-600 text-white border-blue-600' 
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {ben}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export function CompanySettings() {
  const { currentCompanyProfile, currentUser, currentUserClaims } = useData();
  const [activeTab, setActiveTab] = useState('company'); 
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showManageTeam, setShowManageTeam] = useState(false); // <-- State for Modal
  const navigate = useNavigate(); 

  const [compData, setCompData] = useState({});
  const [personalData, setPersonalData] = useState({ name: '' });
  const [logoUploading, setLogoUploading] = useState(false);

  // Check Permissions
  const isCompanyAdmin = currentUserClaims?.roles?.[currentCompanyProfile?.id] === 'company_admin' 
                         || currentUserClaims?.roles?.globalRole === 'super_admin';

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
        companyLogoUrl: currentCompanyProfile.companyLogoUrl || '',
        hiringPreferences: currentCompanyProfile.hiringPreferences || {},
        structuredOffers: currentCompanyProfile.structuredOffers || {} 
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

  const handleSaveCompany = async () => {
    setLoading(true);
    setSuccessMsg('');
    try {
      const companyRef = doc(db, "companies", currentCompanyProfile.id);
      await updateDoc(companyRef, {
        companyName: compData.companyName,
        contact: { phone: compData.phone, email: compData.email },
        address: { street: compData.street, city: compData.city, state: compData.state, zip: compData.zip },
        legal: { mcNumber: compData.mcNumber, dotNumber: compData.dotNumber },
        hiringPreferences: compData.hiringPreferences,
        structuredOffers: compData.structuredOffers 
      });
      setSuccessMsg('Company settings saved.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error("Save failed", error);
      alert("Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrefChange = (key, checked) => {
    setCompData(prev => ({
        ...prev,
        hiringPreferences: { ...prev.hiringPreferences, [key]: checked }
    }));
  };

  const handleOfferDataChange = (key, data) => {
    setCompData(prev => ({
        ...prev,
        structuredOffers: { ...prev.structuredOffers, [key]: data }
    }));
  };

  const handleSavePersonal = async () => {
      setLoading(true);
      try {
          const userRef = doc(db, "users", currentUser.uid);
          await updateDoc(userRef, { name: personalData.name });
          setSuccessMsg('Personal profile updated.');
          setTimeout(() => setSuccessMsg(''), 3000);
      } catch (error) {
          console.error("User save failed", error);
      } finally { setLoading(false); }
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
          setSuccessMsg("Logo uploaded!");
      } catch (error) { console.error("Logo failed", error); } finally { setLogoUploading(false); }
  };

  const renderContent = () => {
    if (activeTab === 'company') {
        return (
          <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
            <div className="border-b border-gray-200 pb-6 flex justify-between items-end">
              <div>
                  <h2 className="text-2xl font-bold text-gray-900">Company Profile</h2>
                  <p className="text-gray-500 mt-1">Manage your official details.</p>
              </div>
            </div>
            
            {/* --- NEW: MANAGE TEAM SECTION --- */}
            {isCompanyAdmin && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Team Management</h3>
                        <p className="text-sm text-gray-500">Invite recruiters and set daily performance goals.</p>
                    </div>
                    <button 
                        onClick={() => setShowManageTeam(true)}
                        className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-md transition-all"
                    >
                        <UserPlus size={18} /> Manage Team
                    </button>
                </div>
            )}
            {/* --------------------------------- */}

            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 flex items-center gap-6">
                <div className="w-20 h-20 bg-white rounded-lg shadow-sm flex items-center justify-center border border-gray-200 overflow-hidden shrink-0">
                    {compData.companyLogoUrl ? <img src={compData.companyLogoUrl} alt="Logo" className="w-full h-full object-contain" /> : <Building className="text-gray-400" size={32} />}
                </div>
                <div>
                    <h4 className="font-semibold text-gray-900">Company Logo</h4>
                    <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm mt-2 inline-block">
                        {logoUploading ? 'Uploading...' : 'Change Logo'}
                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={logoUploading} />
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label><input type="text" value={compData.companyName} onChange={(e) => setCompData({...compData, companyName: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">MC Number</label><input type="text" value={compData.mcNumber} onChange={(e) => setCompData({...compData, mcNumber: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg" /></div>
            </div>

            {/* --- STRUCTURED JOB OFFERS --- */}
            <div className="mt-8 border-t border-gray-200 pt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Hiring Positions & Offers</h3>
                <p className="text-sm text-gray-500 mb-6">Standardize your offers to help drivers find you.</p>
                
                <div className="grid grid-cols-1 gap-4">
                    {[
                        {id: 'companyDriverSolo', label: 'Company Driver (Solo)'},
                        {id: 'companyDriverTeam', label: 'Company Driver (Team)'},
                        {id: 'ownerOperatorSolo', label: 'Owner Operator (Solo)'},
                        {id: 'ownerOperatorTeam', label: 'Owner Operator (Team)'},
                        {id: 'leaseOperatorSolo', label: 'Lease Operator (Solo)'},
                        {id: 'leaseOperatorTeam', label: 'Lease Operator (Team)'},
                    ].map(pos => (
                        <StructuredOfferForm 
                            key={pos.id}
                            id={pos.id}
                            label={pos.label}
                            checked={compData.hiringPreferences?.[pos.id]}
                            offerData={compData.structuredOffers?.[pos.id]}
                            onCheckChange={(e) => handlePrefChange(pos.id, e.target.checked)}
                            onDataChange={(data) => handleOfferDataChange(pos.id, data)}
                        />
                    ))}
                </div>
            </div>

            <div className="pt-6 flex justify-end border-t border-gray-100">
               <button onClick={handleSaveCompany} disabled={loading} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-lg transition-all">
                 {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                 Save Changes
               </button>
            </div>
          </div>
        );
    }
    
    if (activeTab === 'personal') {
        return (
          <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-2xl font-bold text-gray-900">Personal Profile</h2>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                    <input type="text" value={personalData.name} onChange={(e) => setPersonalData({...personalData, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input type="text" value={currentUser?.email || ''} readOnly className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50" />
                </div>
                <div className="flex justify-end pt-4">
                     <button onClick={handleSavePersonal} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />} Update Profile
                    </button>
                </div>
            </div>
          </div>
        );
    }

    return <div className="p-10 text-center text-gray-500">Module coming soon.</div>;
  };

  if (!currentCompanyProfile) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
       <div className="h-16 bg-white border-b border-gray-200 mb-8 flex items-center px-8">
          <button onClick={() => navigate('/company/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
             <ArrowLeft size={20} /> Back to Dashboard
          </button>
       </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex flex-col md:flex-row gap-8">
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
          <main className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 min-h-[600px] relative">
            {successMsg && <div className="absolute top-6 right-8 px-4 py-3 bg-green-100 text-green-800 rounded-lg font-bold flex items-center gap-2"><CheckCircle size={16} /> {successMsg}</div>}
            {renderContent()}
          </main>
        </div>
      </div>
      
      {/* Render the Manage Team Modal if active */}
      {showManageTeam && (
          <ManageTeamModal 
              companyId={currentCompanyProfile.id} 
              onClose={() => setShowManageTeam(false)} 
          />
      )}
    </div>
  );
}