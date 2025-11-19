// src/components/admin/ComplianceWidget.jsx
import React, { useMemo } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, AlertOctagon } from 'lucide-react';
import { getFieldValue } from '../../utils/helpers';

export function ComplianceWidget({ applications }) {
  
  const alerts = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const results = [];

    // Only check drivers who are "Approved" (Hired)
    const activeDrivers = applications.filter(app => app.status === 'Approved');

    activeDrivers.forEach(driver => {
      const name = `${getFieldValue(driver.firstName)} ${getFieldValue(driver.lastName)}`;
      
      // 1. Check CDL
      if (driver.cdlExpiration) {
        const cdlDate = new Date(driver.cdlExpiration);
        if (cdlDate < today) {
          results.push({ id: driver.id, name, type: 'CDL License', date: driver.cdlExpiration, status: 'expired' });
        } else if (cdlDate < thirtyDaysFromNow) {
          results.push({ id: driver.id, name, type: 'CDL License', date: driver.cdlExpiration, status: 'warning' });
        }
      }

      // 2. Check TWIC (if applicable)
      if (driver['has-twic'] === 'yes' && driver.twicExpiration) {
        const twicDate = new Date(driver.twicExpiration);
        if (twicDate < today) {
          results.push({ id: driver.id, name, type: 'TWIC Card', date: driver.twicExpiration, status: 'expired' });
        } else if (twicDate < thirtyDaysFromNow) {
          results.push({ id: driver.id, name, type: 'TWIC Card', date: driver.twicExpiration, status: 'warning' });
        }
      }

      // 3. Check Medical Card (if we had the field, similar logic here)
    });

    // Sort: Expired first, then upcoming
    return results.sort((a, b) => (a.status === 'expired' ? -1 : 1));
  }, [applications]);

  if (alerts.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 h-full flex flex-col items-center justify-center text-center">
        <div className="p-3 bg-green-100 text-green-600 rounded-full mb-3">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="font-bold text-gray-900">100% Compliant</h3>
        <p className="text-sm text-gray-500 mt-1">All active driver documents are up to date.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-gray-200 bg-red-50 flex justify-between items-center">
        <h3 className="font-bold text-red-800 flex items-center gap-2">
          <AlertOctagon size={20} /> Compliance Action Needed
        </h3>
        <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded-full">
          {alerts.length} Issues
        </span>
      </div>
      
      <div className="overflow-y-auto p-0 flex-1 max-h-[300px]">
        <div className="divide-y divide-gray-100">
          {alerts.map((alert, index) => (
            <div key={`${alert.id}-${index}`} className="p-4 flex items-start gap-3 hover:bg-gray-50 transition">
              <div className={`mt-1 ${alert.status === 'expired' ? 'text-red-600' : 'text-yellow-600'}`}>
                {alert.status === 'expired' ? <AlertOctagon size={18} /> : <AlertTriangle size={18} />}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{alert.name}</p>
                <p className="text-xs text-gray-600">
                  {alert.type} {alert.status === 'expired' ? 'expired on' : 'expires on'} <span className="font-mono font-medium">{alert.date}</span>
                </p>
              </div>
              {alert.status === 'expired' && (
                <span className="ml-auto text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded uppercase">Expired</span>
              )}
              {alert.status === 'warning' && (
                 <span className="ml-auto text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded uppercase">Soon</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}