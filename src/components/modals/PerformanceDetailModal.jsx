// src/components/modals/PerformanceDetailModal.jsx
import React from 'react';
import { X, Trophy, Phone, CheckCircle, XCircle, Clock, Ban, ThumbsDown, MessageSquare } from 'lucide-react';

export function PerformanceDetailModal({ data, onClose }) {
  // Sort data same as widget: Contacts desc, then Dials desc
  const sortedData = [...data].sort((a, b) => {
      if (b.contacts !== a.contacts) return b.contacts - a.contacts;
      return b.dials - a.dials;
  });

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl border border-gray-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Trophy className="text-yellow-500" /> Daily Team Performance
            </h2>
            <p className="text-sm text-gray-500">Detailed breakdown of today's calling activity.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto p-0">
            <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 z-10 shadow-sm text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-4 border-b border-gray-100 bg-gray-50">Team Member</th>
                        <th className="px-4 py-4 border-b border-gray-100 bg-gray-50 text-center">
                            <div className="flex flex-col items-center gap-1"><Phone size={14} /> Dials</div>
                        </th>
                        <th className="px-4 py-4 border-b border-gray-100 bg-gray-50 text-center text-green-600">
                            <div className="flex flex-col items-center gap-1"><CheckCircle size={14} /> Connected</div>
                        </th>
                        <th className="px-4 py-4 border-b border-gray-100 bg-gray-50 text-center text-blue-600">
                            <div className="flex flex-col items-center gap-1"><Clock size={14} /> Callback</div>
                        </th>
                        <th className="px-4 py-4 border-b border-gray-100 bg-gray-50 text-center text-gray-600">
                            <div className="flex flex-col items-center gap-1"><ThumbsDown size={14} /> Not Int.</div>
                        </th>
                        <th className="px-4 py-4 border-b border-gray-100 bg-gray-50 text-center text-orange-600">
                            <div className="flex flex-col items-center gap-1"><Ban size={14} /> Not Qual.</div>
                        </th>
                        <th className="px-4 py-4 border-b border-gray-100 bg-gray-50 text-center text-yellow-600">
                            <div className="flex flex-col items-center gap-1"><MessageSquare size={14} /> VM / No Ans</div>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sortedData.map((user, index) => {
                        const outcomes = user.stats || {};
                        const connected = outcomes['connected'] || 0;
                        const callback = outcomes['callback'] || 0;
                        const notInterested = outcomes['not_interested'] || 0;
                        const notQualified = outcomes['not_qualified'] || 0;
                        const noResponse = (outcomes['voicemail'] || 0) + (outcomes['no_answer'] || 0) + (outcomes['wrong_number'] || 0);

                        return (
                            <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {index + 1}
                                        </div>
                                        <span className="font-semibold text-gray-900">{user.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center font-mono font-bold text-gray-800 bg-gray-50/50">
                                    {user.dials}
                                </td>
                                <td className="px-4 py-4 text-center font-medium text-green-700 bg-green-50/30">
                                    {connected}
                                </td>
                                <td className="px-4 py-4 text-center font-medium text-blue-700 bg-blue-50/30">
                                    {callback}
                                </td>
                                <td className="px-4 py-4 text-center font-medium text-gray-600">
                                    {notInterested}
                                </td>
                                <td className="px-4 py-4 text-center font-medium text-orange-600">
                                    {notQualified}
                                </td>
                                <td className="px-4 py-4 text-center font-medium text-yellow-600">
                                    {noResponse}
                                </td>
                            </tr>
                        );
                    })}
                    {sortedData.length === 0 && (
                        <tr>
                            <td colSpan="7" className="p-8 text-center text-gray-400 italic">No activity recorded today.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-right rounded-b-xl">
            <button onClick={onClose} className="px-5 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all">
                Close
            </button>
        </div>
      </div>
    </div>
  );
}