import React from 'react';
import { ParkingRecord } from '../types';
import { X, Database, Accessibility, MapPin } from 'lucide-react';

interface DatabaseViewProps {
  records: ParkingRecord[];
  onClose: () => void;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({ records, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Base de Datos</h2>
              <p className="text-xs text-gray-500">Vista SQL Simulada</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* SQL Console Simulation */}
        <div className="bg-slate-900 p-4 text-green-400 font-mono text-sm overflow-x-auto">
          <p className="opacity-70 mb-2">-- Consultando registros actuales</p>
          <div className="flex gap-2">
            <span className="text-purple-400">SELECT</span> 
            <span className="text-blue-300">*</span> 
            <span className="text-purple-400">FROM</span> 
            <span className="text-yellow-300">parking_records</span> 
            <span className="text-purple-400">ORDER BY</span> 
            <span className="text-yellow-300">entry_time</span> 
            <span className="text-purple-400">DESC</span>;
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="p-4 font-mono text-xs font-semibold text-gray-500 border-b uppercase tracking-wider">ID</th>
                <th className="p-4 font-mono text-xs font-semibold text-gray-500 border-b uppercase tracking-wider">Owner ID</th>
                <th className="p-4 font-mono text-xs font-semibold text-gray-500 border-b uppercase tracking-wider">Plate</th>
                <th className="p-4 font-mono text-xs font-semibold text-gray-500 border-b uppercase tracking-wider">Type</th>
                <th className="p-4 font-mono text-xs font-semibold text-gray-500 border-b uppercase tracking-wider">Spot</th>
                <th className="p-4 font-mono text-xs font-semibold text-gray-500 border-b uppercase tracking-wider">Priority</th>
                <th className="p-4 font-mono text-xs font-semibold text-gray-500 border-b uppercase tracking-wider">Status</th>
                <th className="p-4 font-mono text-xs font-semibold text-gray-500 border-b uppercase tracking-wider">Details</th>
                <th className="p-4 font-mono text-xs font-semibold text-gray-500 border-b uppercase tracking-wider">Entry_Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400 font-mono text-sm">
                    0 rows returned.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-blue-50/50 transition-colors font-mono text-sm">
                    <td className="p-4 text-gray-400 truncate max-w-[80px]" title={record.id}>
                      {record.id.substring(0, 8)}...
                    </td>
                    <td className="p-4 text-gray-700">
                      {record.ownerId || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="p-4 font-bold text-gray-800">
                      {record.plate}
                    </td>
                    <td className="p-4 text-gray-600">
                      {record.vehicleType}
                    </td>
                    <td className="p-4">
                      {record.spotNumber ? (
                         <span className={`px-2 py-0.5 rounded text-xs font-bold border flex items-center gap-1 w-fit ${
                           record.spotNumber.startsWith('P') ? 'bg-blue-100 text-blue-700 border-blue-200' :
                           record.spotNumber.startsWith('M') ? 'bg-orange-100 text-orange-700 border-orange-200' :
                           'bg-gray-100 text-gray-600 border-gray-200'
                         }`}>
                           <MapPin size={10} /> {record.spotNumber}
                         </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                     <td className="p-4 text-center">
                      {record.isDisabled ? (
                        <span className="inline-flex items-center justify-center p-1 bg-blue-100 text-blue-600 rounded">
                           <Accessibility size={14} />
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        record.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-500 max-w-[150px] truncate">
                      {record.details ? (
                         <span title={`${record.details.make} - ${record.details.color}`}>
                           {record.details.make} ({record.details.color})
                         </span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="p-4 text-gray-600 whitespace-nowrap">
                      {new Date(record.entryTime).toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
          <span>{records.length} registros encontrados</span>
          <span>Query time: 0.00ms</span>
        </div>
      </div>
    </div>
  );
};