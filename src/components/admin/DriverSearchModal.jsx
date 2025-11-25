// src/components/admin/DriverSearchModal.jsx
import React, { useState } from 'react';
import { collection, query, where, getDocs, limit, startAfter, orderBy } from 'firebase/firestore';
import { db, functions } from '../../firebase/config'; // Need functions
import { httpsCallable } from 'firebase/functions'; // Need httpsCallable
import { Search, User, MapPin, Truck, X, Loader2, Briefcase, ChevronDown, ArrowDown, ArrowLeft, Mail, Phone, Calendar, FileText, Send } from 'lucide-react';
import { getFieldValue } from '../../utils/helpers';
import { useData } from '../../App.jsx'; // Need company data

const DRIVER_TYPES = [
    { value: "companyDriverSolo", label: "Company Solo" },
    { value: "companyDriverTeam", label: "Company Team" },
    { value: "ownerOperatorSolo", label: "Owner Op Solo" },
    { value: "ownerOperatorTeam", label: "Owner Op Team" },
    { value: "leaseOperatorSolo", label: "Lease Solo" },
    { value: "leaseOperatorTeam", label: "Lease Team" },
    { value: "unidentified", label: "Unidentified" }
];

const US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

// --- SUB-COMPONENT: FULL PROFILE VIEW ---
function DriverProfileView({ driver, onBack }) {
    const { currentCompanyProfile } = useData(); // Get current company info
    const [sending, setSending] = useState(false);
    const [inviteSent, setInviteSent] = useState(false);

    const pi = driver.personalInfo || {};
    const qual = driver.qualifications || {};
    const dp = driver.driverProfile || {};
    const lic = driver.licenses || [];
    
    const handleSendInvite = async () => {
        if (inviteSent) return;
        if (!pi.email || pi.email.includes('placeholder.com')) {
            alert("This driver does not have a valid email address.");
            return;
        }
        if (!confirm(`Send job invite to ${pi.firstName}?`)) return;

        setSending(true);
        try {
            const sendFn = httpsCallable(functions, 'sendDriverInvite');
            const result = await sendFn({
                driverEmail: pi.email,
                driverName: `${pi.firstName} ${pi.lastName}`,
                companyName: currentCompanyProfile?.companyName || "Our Company",
                message: "" // Optional custom message
            });

            if (result.data.success) {
                setInviteSent(true);
                alert("Invite sent successfully!");
            } else {
                alert("Failed to send: " + result.data.error);
            }
        } catch (err) {
            console.error(err);
            alert("Error sending invite: " + err.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center gap-4 bg-gray-50">
                <button onClick={onBack} className="p-2 hover:bg-white rounded-full border border-transparent hover:border-gray-200 transition">
                    <ArrowLeft size={20} className="text-gray-600"/>
                </button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">
                        {getFieldValue(pi.firstName)} {getFieldValue(pi.lastName)}
                    </h2>
                    <p className="text-sm text-gray-500">Driver Profile</p>
                </div>
            </div>

            {/* Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                
                {/* 1. Header Card */}
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold shrink-0 border-4 border-white shadow-lg">
                        {getFieldValue(pi.firstName).charAt(0)}
                    </div>
                    <div className="flex-1 space-y-2">
                         <div className="flex flex-wrap gap-2 mb-1">
                            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                {dp.type || 'Unidentified'}
                            </span>
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-green-200">
                                {dp.availability ? dp.availability.replace('_', ' ') : 'Available'}
                            </span>
                         </div>
                         <h1 className="text-3xl font-bold text-gray-900">{getFieldValue(pi.firstName)} {getFieldValue(pi.lastName)}</h1>
                         <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-600 text-sm">
                             {pi.city && <span className="flex items-center gap-1"><MapPin size={16}/> {pi.city}, {pi.state}</span>}
                             {pi.email && <span className="flex items-center gap-1"><Mail size={16}/> {pi.email}</span>}
                             {pi.phone && <span className="flex items-center gap-1"><Phone size={16}/> {pi.phone}</span>}
                         </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 2. Qualifications */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Truck className="text-blue-600"/> Qualifications
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="text-gray-500">Experience</span>
                                <span className="font-semibold">{qual.experienceYears || 'Not Listed'}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="text-gray-500">Legal to Work?</span>
                                <span className="font-semibold">{qual.legalWork || 'Yes'}</span>
                            </div>
                             <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="text-gray-500">Source</span>
                                <span className="font-semibold text-gray-400">{dp.isBulkUpload ? 'Bulk Import' : 'App Signup'}</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. License Info */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                         <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FileText className="text-blue-600"/> License / CDL
                        </h3>
                        {lic.length > 0 ? lic.map((l, i) => (
                             <div key={i} className="space-y-3">
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500">Class</span>
                                    <span className="font-semibold">{l.class || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500">State</span>
                                    <span className="font-semibold">{l.state || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500">Endorsements</span>
                                    <span className="font-semibold">{l.endorsements || 'None'}</span>
                                </div>
                             </div>
                        )) : (
                            <p className="text-gray-500 italic">No license details available.</p>
                        )}
                    </div>
                </div>

                {/* 4. Action Bar */}
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h4 className="font-bold text-blue-900">Interested in this driver?</h4>
                        <p className="text-sm text-blue-700">You can invite them to apply to your specific job opening.</p>
                    </div>
                    <button 
                        onClick={handleSendInvite} 
                        disabled={sending || inviteSent}
                        className={`px-6 py-2 font-bold rounded-lg shadow-sm transition flex items-center gap-2
                            ${inviteSent 
                                ? 'bg-green-600 text-white cursor-default' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            } disabled:opacity-50`}
                    >
                        {sending ? <Loader2 className="animate-spin" size={18}/> : (inviteSent ? <CheckCircle size={18}/> : <Send size={18}/>)}
                        {sending ? 'Sending...' : (inviteSent ? 'Invite Sent' : 'Send Invite')}
                    </button>
                </div>
            </div>
        </div>
    );
}


// --- MAIN SEARCH MODAL ---
export function DriverSearchModal({ onClose }) {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedStates, setSelectedStates] = useState([]);
  const [statusFilter, setStatusFilter] = useState('actively_looking');
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null); 
  const [lastDoc, setLastDoc] = useState(null); 
  const [hasMore, setHasMore] = useState(true); 

  const toggleType = (value) => {
      if (selectedTypes.includes(value)) {
        setSelectedTypes(selectedTypes.filter(t => t !== value));
      } else {
          setSelectedTypes([...selectedTypes, value]);
      }
  };

  const toggleState = (st) => {
      if (selectedStates.includes(st)) {
          setSelectedStates(selectedStates.filter(s => s !== st));
      } else {
          setSelectedStates([...selectedStates, st]);
      }
  };

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setResults([]);
    setLastDoc(null);
    setHasMore(true);
    setSelectedDriver(null); 

    await fetchDrivers(null);
  };

  const handleLoadMore = async () => {
      if (!lastDoc || loading) return;
      setLoading(true);
      await fetchDrivers(lastDoc);
  };

  const fetchDrivers = async (startAfterDoc) => {
    try {
      const driversRef = collection(db, "drivers");
      const constraints = [];
      
      if (statusFilter) {
        constraints.push(where("driverProfile.availability", "==", statusFilter));
      }
      
      if (selectedTypes.length > 0) {
        constraints.push(where("driverProfile.type", "in", selectedTypes));
      }
      
      constraints.push(orderBy("createdAt", "desc"));

      if (startAfterDoc) {
          constraints.push(startAfter(startAfterDoc));
      }
      constraints.push(limit(10)); 

      const q = query(driversRef, ...constraints);
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
          if (!startAfterDoc) setError("No drivers found matching your criteria.");
          setHasMore(false);
      } else {
          let foundDrivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          if (selectedStates.length > 0) {
              foundDrivers = foundDrivers.filter(driver => 
                 driver.personalInfo?.state && selectedStates.includes(driver.personalInfo.state.toUpperCase())
              );
          }

          if (startAfterDoc) {
              setResults(prev => [...prev, ...foundDrivers]);
          } else {
              setResults(foundDrivers);
          }
          
          setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
          if (snapshot.docs.length < 10) setHasMore(false);
      }

    } catch (e) {
      console.error("Search error:", e);
      setError("Search failed. If combining filters, ensure Firebase indexes are created.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
        
        {selectedDriver ? (
            <DriverProfileView 
                driver={selectedDriver} 
                onBack={() => setSelectedDriver(null)} 
            />
        ) : (
            <>
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl shrink-0">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Search className="text-blue-600" /> Search Driver Database
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20} /></button>
                </div>

                <div className="p-6 bg-white border-b border-gray-200 flex flex-col gap-4 shrink-0">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-7">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Driver Types</label>
                            <div className="flex flex-wrap gap-2">
                                {DRIVER_TYPES.map(type => (
                                    <button
                                        key={type.value}
                                        onClick={() => toggleType(type.value)}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all ${
                                            selectedTypes.includes(type.value)
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                        }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                                <button onClick={() => setSelectedTypes([])} className="px-3 py-1.5 text-xs text-gray-500 underline hover:text-gray-800">
                                    Clear
                                </button>
                            </div>
                        </div>

                        <div className="md:col-span-3 relative">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">States</label>
                            <button 
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-left flex justify-between items-center bg-white"
                                onClick={(e) => { e.stopPropagation(); setIsStateDropdownOpen(!isStateDropdownOpen); }}
                            >
                                <span className="text-sm text-gray-700 truncate">
                                    {selectedStates.length === 0 ? "Any State" : `${selectedStates.length} selected`}
                                </span>
                                <ChevronDown size={16} className="text-gray-400" />
                            </button>

                            {isStateDropdownOpen && (
                                <div className="absolute top-full left-0 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-20 p-2 grid grid-cols-3 gap-1" onClick={e => e.stopPropagation()}>
                                    {US_STATES.map(state => (
                                        <button
                                            key={state}
                                            onClick={() => toggleState(state)}
                                            className={`px-2 py-1 text-xs font-medium rounded ${
                                                selectedStates.includes(state) ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 text-gray-600'
                                            }`}
                                        >
                                            {state}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2 flex items-end">
                            <button 
                                onClick={handleSearch} 
                                disabled={loading}
                                className="w-full px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50 h-[42px]"
                            >
                                {loading && !lastDoc ? <Loader2 className="animate-spin" /> : <Search size={18} />}
                                Search
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
                    {error && <p className="text-red-600 bg-red-50 p-4 rounded-lg text-center border border-red-200">{error}</p>}
                    
                    {!loading && results.length === 0 && !error && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Search size={48} className="mb-2 opacity-20" />
                        <p>No available drivers found. Adjust filters to see results.</p>
                        </div>
                    )}

                    {results.map(driver => {
                        const pi = driver.personalInfo || {};
                        const qual = driver.qualifications || {};
                        const dp = driver.driverProfile || {};
                        const typeLabel = DRIVER_TYPES.find(t => t.value === dp.type)?.label || dp.type;
                        
                        return (
                            <div key={driver.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group">
                                <div className="flex gap-4 items-center">
                                    <div className="bg-blue-50 p-3 rounded-full text-blue-600 shrink-0 group-hover:bg-blue-100 transition-colors">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">
                                            {getFieldValue(pi.firstName)} {pi.lastName ? pi.lastName.charAt(0) + '.' : ''}
                                        </h3>
                                        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-1">
                                            <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs font-medium"><MapPin size={12}/> {getFieldValue(pi.city)}, {getFieldValue(pi.state)}</span>
                                            <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs font-medium"><Truck size={12}/> {getFieldValue(qual.experienceYears)} Yrs</span>
                                            {typeLabel && <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold"><Briefcase size={12}/> {typeLabel}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-xs font-bold px-3 py-1 bg-green-100 text-green-800 rounded-full uppercase tracking-wide">
                                        {dp.availability ? dp.availability.replace('_', ' ') : 'Available'}
                                    </span>
                                    <button 
                                        onClick={() => setSelectedDriver(driver)}
                                        className="text-blue-600 font-semibold text-sm hover:underline disabled:opacity-50"
                                    >
                                        View Full Profile
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {hasMore && results.length > 0 && (
                        <div className="pt-4 pb-2 text-center">
                            <button 
                                onClick={handleLoadMore}
                                disabled={loading}
                                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto"
                            >
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <ArrowDown size={16} />}
                                {loading ? "Loading..." : "Load More Drivers"}
                            </button>
                        </div>
                    )}
                </div>
            </>
        )}
      </div>
    </div>
  );
}