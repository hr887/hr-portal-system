// src/components/admin/settings/CompanyProfileTab.jsx
import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from '../../../firebase/config';
import { Building, Save, Loader2, DollarSign, Clock } from 'lucide-react';
import { useToast } from '../../feedback/ToastProvider'; // <-- NEW IMPORT

// --- CONSTANTS ---
const HOME_TIME_OPTIONS = ["Daily", "Weekends", "Weekly", "Bi-Weekly", "Monthly", "OTR"];
const BENEFIT_OPTIONS = ["Health Insurance", "Dental", "401k", "Sign-on Bonus", "Pet Policy", "Rider Policy", "New Equipment"];

// --- HELPER COMPONENT ---
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

export function CompanyProfileTab({ currentCompanyProfile }) {
    const { showSuccess, showError } = useToast();
    const [compData, setCompData] = useState({});
    const [loading, setLoading] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);

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
    }, [currentCompanyProfile]);

    const handleSaveCompany = async () => {
        setLoading(true);
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
            showSuccess('Company settings saved successfully.');
        } catch (error) {
            console.error("Save failed", error);
            showError("Failed to save settings: " + error.message);
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
            showSuccess("Logo uploaded successfully!");
        } catch (error) {
            console.error("Logo failed", error);
            showError("Logo upload failed: " + error.message);
        } finally {
            setLogoUploading(false);
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

    return (
        <div className="space-y-8 max-w-4xl animate-in fade-in">
            <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900">Company Profile</h2>
                <p className="text-sm text-gray-500 mt-1">Manage your public company details and branding.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center gap-6 shadow-sm">
                <div className="w-24 h-24 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden shrink-0">
                    {compData.companyLogoUrl ? <img src={compData.companyLogoUrl} alt="Logo" className="w-full h-full object-contain" /> : <Building className="text-gray-400" size={32} />}
                </div>
                <div>
                    <h4 className="font-semibold text-gray-900">Company Logo</h4>
                    <p className="text-xs text-gray-500 mb-3">Recommended size: 400x400px. PNG or JPG.</p>
                    <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm inline-block">
                        {logoUploading ? 'Uploading...' : 'Upload New Logo'}
                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={logoUploading} />
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label><input type="text" value={compData.companyName || ''} onChange={(e) => setCompData({ ...compData, companyName: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">MC Number</label><input type="text" value={compData.mcNumber || ''} onChange={(e) => setCompData({ ...compData, mcNumber: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Hiring Positions & Offers</h3>
                <p className="text-sm text-gray-500 mb-6">Standardize your offers to help drivers find you.</p>
                <div className="grid grid-cols-1 gap-4">
                    {[
                        { id: 'companyDriverSolo', label: 'Company Driver (Solo)' },
                        { id: 'companyDriverTeam', label: 'Company Driver (Team)' },
                        { id: 'ownerOperatorSolo', label: 'Owner Operator (Solo)' },
                        { id: 'ownerOperatorTeam', label: 'Owner Operator (Team)' },
                        { id: 'leaseOperatorSolo', label: 'Lease Operator (Solo)' },
                        { id: 'leaseOperatorTeam', label: 'Lease Operator (Team)' },
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
                <button onClick={handleSaveCompany} disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-lg transition-all">
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} Save Changes
                </button>
            </div>
        </div>
    );
}