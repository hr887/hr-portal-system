// src/components/admin/BulkUploadLayout.jsx
import React from 'react';
import { Upload, FileText, CheckCircle, Loader2, Save, X, AlertCircle, Link as LinkIcon, FileSpreadsheet } from 'lucide-react';

export function BulkUploadLayout({ 
    title, 
    onClose,
    // State from useBulkImport hook
    step,
    importMethod,
    setImportMethod,
    sheetUrl,
    setSheetUrl,
    processingSheet,
    handleSheetImport,
    handleFileChange,
    csvData,
    reset,
    // Actions specific to parent
    onConfirm,
    uploading,
    progress,
    stats
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
        {/* Fixed: Added max-h-[90vh] and flex-col to constrain height and enable internal scrolling */}
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Upload className="text-blue-600" /> {title}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20}/></button>
            </div>

            {/* Content Body */}
            <div className="p-6 flex-1 flex flex-col overflow-hidden">
                
                {/* STEP 1: UPLOAD */}
                {step === 'upload' && (
                    <div className="space-y-6 max-w-xl mx-auto w-full h-full overflow-y-auto">
                         {/* Toggle */}
                         <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setImportMethod('file')}
                                className={`flex-1 py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-all ${
                                    importMethod === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <FileSpreadsheet size={18} /> Upload File
                            </button>
                            <button 
                                onClick={() => setImportMethod('gsheet')}
                                className={`flex-1 py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-all ${
                                    importMethod === 'gsheet' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <LinkIcon size={18} /> Google Sheet
                            </button>
                        </div>

                        {importMethod === 'file' && (
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:bg-gray-50 transition-colors relative group animate-in fade-in">
                                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <FileText size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Upload Excel or CSV</h3>
                                <p className="text-gray-500 mt-2">Drag and drop or click to browse</p>
                                <div className="mt-6 text-xs text-gray-400 bg-white p-2 rounded border border-gray-100">
                                    Columns: First Name, Last Name, Phone, Email...
                                </div>
                            </div>
                        )}

                        {importMethod === 'gsheet' && (
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 animate-in fade-in">
                                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
                                    <LinkIcon size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 text-center mb-4">Paste Google Sheet Link</h3>
                                
                                <div className="space-y-4">
                                    <input 
                                        type="text" 
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        placeholder="https://docs.google.com/spreadsheets/d/..."
                                        value={sheetUrl}
                                        onChange={(e) => setSheetUrl(e.target.value)}
                                    />
                                    
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-800 flex items-start gap-2">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                        <span>
                                            <strong>Important:</strong> Ensure the Sheet is set to "Anyone with the link" or "Published to Web".
                                        </span>
                                    </div>

                                    <button 
                                        onClick={handleSheetImport}
                                        disabled={processingSheet || !sheetUrl}
                                        className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {processingSheet ? <Loader2 className="animate-spin"/> : <CheckCircle size={18}/>}
                                        {processingSheet ? 'Fetching Data...' : 'Import Sheet'}
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {/* STEP 2: PREVIEW */}
                {step === 'preview' && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Preview Data</h3>
                                <p className="text-sm text-gray-500">Found {csvData.length} unique records ready to add.</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={reset} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium flex items-center gap-2 transition-colors">
                                    <X size={18} /> Cancel
                                </button>
                                <button 
                                    onClick={onConfirm} 
                                    disabled={uploading}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center gap-2 disabled:opacity-50 transition-all"
                                >
                                    {uploading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                    {uploading ? 'Processing...' : 'Confirm & Merge'}
                                </button>
                            </div>
                        </div>
                        
                        {uploading && <p className="text-blue-600 font-semibold text-center py-2 animate-pulse shrink-0">{progress}</p>}

                        {/* Fixed: Table Container with overflow-auto and flex-1 */}
                        <div className="border border-gray-200 rounded-lg flex-1 overflow-auto relative shadow-inner bg-gray-50">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-white text-gray-900 font-bold sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="p-3 border-b w-1/5">First Name</th>
                                        <th className="p-3 border-b w-1/5">Last Name</th>
                                        <th className="p-3 border-b w-1/4">Email</th>
                                        <th className="p-3 border-b w-1/5">Phone</th>
                                        <th className="p-3 border-b w-1/6">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {csvData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="p-3 font-medium text-gray-900">{row.firstName}</td>
                                            <td className="p-3">{row.lastName}</td>
                                            <td className="p-3">
                                                {row.isEmailPlaceholder ? (
                                                    <span className="text-yellow-600 italic text-xs flex items-center gap-1">
                                                        <AlertCircle size={12}/> Auto-ID
                                                    </span>
                                                ) : (
                                                    <span className="truncate block max-w-[200px]" title={row.email}>{row.email}</span>
                                                )}
                                            </td>
                                            <td className="p-3 font-mono text-xs">{row.phone || <span className="text-gray-300">--</span>}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${row.driverType === 'unidentified' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                                                    {row.driverType}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* STEP 3: SUCCESS */}
                {step === 'success' && (
                    <div className="text-center py-20 h-full flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
                            <CheckCircle size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">Import & Merge Complete!</h3>
                        <p className="text-gray-500 mt-2 mb-8">
                            <span className="font-bold text-green-600">{stats?.created || 0} New</span> leads added.<br/>
                            <span className="font-bold text-blue-600">{stats?.updated || 0} Existing</span> leads updated.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button onClick={reset} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors">
                                Upload More
                            </button>
                            <button onClick={onClose} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md transition-colors">
                                Done
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
}