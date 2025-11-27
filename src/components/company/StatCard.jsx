// src/components/company/StatCard.jsx
import React from 'react';

export function StatCard({ title, value, icon, active, onClick, colorClass }) {
  return (
    <div 
      onClick={onClick}
      className={`p-5 rounded-xl shadow-sm border transition-all cursor-pointer flex flex-col justify-between h-full relative overflow-hidden group
        ${active 
          ? `ring-2 ring-offset-1 ${colorClass} bg-white` 
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
        }`}
    >
      <div className="flex justify-between items-start">
        <div>
           <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</p>
           <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${active ? colorClass.replace('ring-', 'bg-').replace('500', '50') + ' text-' + colorClass.split('-')[1] + '-600' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}