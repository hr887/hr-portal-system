// hr portal/src/components/company/DashboardBody.jsx

import React from 'react';
import { 
  Phone, MapPin, User, Calendar, Briefcase, Zap, 
} from 'lucide-react';
import { getFieldValue, formatPhoneNumber } from '../../utils/helpers';

// --- CONFIGURATION (Standardized Columns) ---
const COLUMN_CONFIG = [
    { key: 'name', label: 'Driver / Contact', className: 'align-middle' },
    { key: 'status', label: 'Status', className: 'align-middle' },
    { key: 'qualifications', label: 'Position / Type', className: 'align-middle' },
    { key: 'assignee', label: 'Recruiter', className: 'align-middle' },
    { key: 'date', label: 'Date', className: 'text-right align-middle' },
];

// Helper: Status Badge Styling
const getStatusBadgeStyles = (status) => {
    const s = (status || '').toLowerCase();
    
    if (s.includes('hired') || s.includes('accepted') || s.includes('approved')) {
        return 'bg-green-100 text-green-800 border-green-200';
    }
    
    if (s.includes('rejected') || s.includes('disqualified') || s.includes('declined')) {
        return 'bg-red-100 text-red-800 border-red-200';
    }
    
    if (s.includes('offer') || s.includes('background')) {
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    
    if (s.includes('contacted') || s.includes('attempted') || s.includes('review') || s.includes('interview')) {
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    
    if (s.includes('new') || s.includes('lead')) {
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    
    return 'bg-gray-100 text-gray-700 border-gray-200';
};

// --- COMPONENT ---

/**
 * Renders the main table body (rows and cells) based on dashboard data.
 * This is where column widths and formatting are applied via hardcoded TD structure.
 */
export function DashboardBody({ data, selectedId, onSelect, onPhoneClick, totalCount, loading }) {

    if (loading) {
        // Render skeletons or loading indicator (handled by parent contextually)
        return (
            <tbody className="divide-y divide-gray-100 bg-white">
                {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="flex gap-3"><div className="w-10 h-10 bg-gray-200 rounded-full"></div><div className="space-y-2"><div className="h-4 bg-gray-200 rounded w-32"></div><div className="h-3 bg-gray-200 rounded w-24"></div></div></div></td>
                        <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-20"></div></td>
                        <td className="px-6 py-4"><div className="space-y-2"><div className="h-3 bg-gray-200 rounded w-24"></div><div className="h-3 bg-gray-200 rounded w-16"></div></div></td>
                        <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-24"></div></td>
                        <td className="px-6 py-4 text-right"><div className="h-3 bg-gray-200 rounded w-16 ml-auto"></div></td>
                    </tr>
                ))}
            </tbody>
        );
    }

    if (totalCount === 0) {
        return (
            <tbody className="divide-y divide-gray-100 bg-white">
              <tr>
                  <td colSpan={COLUMN_CONFIG.length} className="p-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                          <Zap size={32} className="opacity-20"/>
                          <p>No drivers found matching your criteria.</p>
                      </div>
                  </td>
              </tr>
            </tbody>
        );
    }
    
    return (
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.map(item => {
            const name = `${getFieldValue(item['firstName'])} ${getFieldValue(item['lastName'])}`;
            const isSelected = selectedId === item.id;
            
            let types = 'Unspecified';
            if (Array.isArray(item.driverType) && item.driverType.length > 0) {
                types = item.driverType.join(', ');
            } else if (typeof item.driverType === 'string' && item.driverType) {
                types = item.driverType;
            }
            const position = item.positionApplyingTo || 'Driver';

            const dateVal = item.submittedAt || item.createdAt;
            const displayDate = dateVal ? new Date(dateVal.seconds * 1000).toLocaleDateString() : '--';

            return (
              <tr 
                key={item.id} 
                onClick={() => onSelect(item)} 
                className={`cursor-pointer transition-colors group border-l-4 ${
                    isSelected 
                    ? 'bg-blue-50/60 border-l-blue-600' 
                    : 'hover:bg-gray-50 border-l-transparent'
                }`}
              >
                {/* Column 1: Name & Contact (name) */}
                <td className="px-6 py-4 align-middle overflow-hidden">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border shrink-0 transition-colors ${
                            isSelected 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-gray-100 text-gray-600 border-gray-200 group-hover:bg-white'
                        }`}>
                            {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors truncate">{name}</p>
                            <div className="flex items-center gap-3 mt-1">
                                <button 
                                    onClick={(e) => onPhoneClick(e, item)} 
                                    className="text-xs text-gray-500 hover:text-green-600 hover:bg-green-50 rounded px-1 -ml-1 py-0.5 flex items-center gap-1 transition-all"
                                    title="Call Driver"
                                >
                                    <Phone size={12} /> {formatPhoneNumber(getFieldValue(item.phone))}
                                </button>
                            </div>
                        </div>
                    </div>
                </td>

                {/* Column 2: Status (status) */}
                <td className="px-6 py-4 align-middle">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusBadgeStyles(item.status)}`}>
                    {item.status || 'New'}
                  </span>
                </td>

                {/* Column 3: Details (qualifications) */}
                <td className="px-6 py-4 align-middle overflow-hidden">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-xs font-bold text-gray-700">
                            <Briefcase size={12} className="text-gray-400"/> {position}
                        </div>
                        <p className="text-[10px] text-gray-500 max-w-[150px] truncate" title={types}>
                            {types}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                            {item.experience || item['experience-years'] ? (
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                    {item.experience || item['experience-years']} Exp
                                </span>
                            ) : null}
                            {item.state && (
                                <span className="flex items-center gap-0.5">
                                    <MapPin size={10}/> {item.state}
                                </span>
                            )}
                        </div>
                    </div>
                </td>

                {/* Column 4: Assignee (assignee) */}
                <td className="px-6 py-4 align-middle">
                    {item.assignedToName ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200 w-fit shadow-sm">
                            <div className="w-4 h-4 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[8px] font-bold">
                                {item.assignedToName.charAt(0)}
                            </div>
                            {item.assignedToName}
                        </span>
                    ) : (
                        <span className="text-xs text-gray-400 italic flex items-center gap-1">
                            <User size={12}/> Unassigned
                        </span>
                    )}
                </td>

                {/* Column 5: Date (date) */}
                <td className="px-6 py-4 align-middle text-right text-xs text-gray-500 font-mono">
                   <div className="flex flex-col items-end gap-1">
                        <span className="flex items-center gap-1"><Calendar size={12} className="opacity-50"/> {displayDate}</span>
                   </div>
                </td>
              </tr>
            );
          })}
        </tbody>
    );
}

// Export the config array for the main table component to use
export const DashboardTableConfig = COLUMN_CONFIG;