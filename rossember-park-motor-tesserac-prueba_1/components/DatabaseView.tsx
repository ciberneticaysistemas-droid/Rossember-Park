import React, { useState, useMemo } from 'react';
import { ParkingRecord, VehicleType } from '../types';
import { X, Database, Accessibility, MapPin, Settings, FileBarChart, LogOut, Search, Clock, Filter, Car, Bike, Zap, Calendar, MoreVertical } from 'lucide-react';
import { generateDailyReport } from '../services/pdfService';

interface DatabaseViewProps {
  records: ParkingRecord[];
  onClose: () => void;
  onOpenSettings: () => void;
  onManualExit: (id: string) => void;
  onOpenSearch: () => void;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({ records, onClose, onOpenSettings, onManualExit, onOpenSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | VehicleType | 'ACTIVE' | 'COMPLETED'>('ALL');

  const handleForceExit = (id: string, plate: string) => {
    if (window.confirm(`¿Estás seguro de que deseas forzar la salida del vehículo ${plate}? Esto lo marcará como completado manualmente.`)) {
      onManualExit(id);
    }
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesSearch = record.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.spotNumber && record.spotNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'ALL') return true;
      if (filterType === 'ACTIVE') return record.status === 'ACTIVE';
      if (filterType === 'COMPLETED') return record.status !== 'ACTIVE';
      return record.vehicleType === filterType;
    });
  }, [records, searchTerm, filterType]);

  // Helper for Time Progress Bar
  const TimeProgressBar = ({ entryTime }: { entryTime: number }) => {
    const elapsedMinutes = Math.floor((Date.now() - entryTime) / 60000);
    const maxHours = 4; // Scale bar to 4 hours max visually
    const progress = Math.min((elapsedMinutes / (maxHours * 60)) * 100, 100);

    let colorClass = 'bg-emerald-500';
    if (elapsedMinutes > 60) colorClass = 'bg-yellow-500';
    if (elapsedMinutes > 180) colorClass = 'bg-orange-500';
    if (elapsedMinutes > 300) colorClass = 'bg-red-500';

    const hours = Math.floor(elapsedMinutes / 60);
    const mins = elapsedMinutes % 60;
    const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

    return (
      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1 font-medium text-slate-500">
          <span className="flex items-center gap-1"><Clock size={10} /> Tiempo</span>
          <span className={hours > 3 ? 'text-red-500 font-bold' : 'text-slate-700'}>{timeString}</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${colorClass} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  const getVehicleIcon = (type: VehicleType) => {
    switch (type) {
      case VehicleType.MOTORCYCLE: return <Bike size={18} className="text-orange-500" />;
      case VehicleType.ELECTRIC: return <Zap size={18} className="text-yellow-500" />;
      default: return <Car size={18} className="text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-0 md:p-6 transition-all duration-300">
      <div className="bg-slate-50 w-full max-w-7xl h-full md:h-[90vh] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative animate-fade-in-up">

        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-0"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl z-0 pointer-events-none"></div>

        {/* Header Section */}
        <div className="relative z-10 px-6 pt-8 pb-6 md:px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/10">
                  <Database size={24} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Panel de Control</h2>
                  <p className="text-blue-200/80 text-sm">Gestión de Vehículos</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onOpenSettings}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/10 transition-all active:scale-95"
                title="Configuración"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={onClose}
                className="p-3 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-200 rounded-xl backdrop-blur-md border border-white/10 transition-all active:scale-95 group"
                title="Cerrar"
              >
                <X size={20} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-8 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Buscar placa o puesto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all shadow-lg"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              {[
                { label: 'Todos', value: 'ALL', icon: Filter },
                { label: 'Activos', value: 'ACTIVE', icon: Clock },
                { label: 'Autos', value: VehicleType.CAR, icon: Car },
                { label: 'Motos', value: VehicleType.MOTORCYCLE, icon: Bike },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value as any)}
                  className={`
                    flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all border
                    ${filterType === filter.value
                      ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'}
                  `}
                >
                  <filter.icon size={16} />
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto relative z-10 bg-slate-50 rounded-t-[2.5rem] p-6 md:p-8">

          <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-8 bg-blue-500 rounded-full inline-block"></span>
              Vehículos en Parqueadero
              <span className="text-slate-400 text-sm font-normal ml-2">({filteredRecords.length})</span>
            </h3>

            <div className="flex gap-3">
              <button
                onClick={onOpenSearch}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors shadow-sm text-sm font-bold"
              >
                <Search size={16} /> <span className="hidden sm:inline">Buscar Placa</span>
              </button>
              <button
                onClick={() => generateDailyReport(records)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors shadow-sm text-sm font-bold"
              >
                <FileBarChart size={16} /> <span className="hidden sm:inline">Reporte</span>
              </button>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="bg-slate-100 p-6 rounded-full mb-4">
                <Database size={48} className="text-slate-300" />
              </div>
              <p className="text-lg font-medium">No se encontraron vehículos</p>
              <p className="text-sm">Intenta ajustar tu búsqueda o filtros</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="group bg-white rounded-3xl p-5 shadow-sm hover:shadow-xl border border-slate-100 hover:border-blue-100 transition-all duration-300 relative overflow-hidden"
                >
                  {/* Status Indicator Strip */}
                  <div className={`absolute top-0 left-0 w-full h-1.5 ${record.status === 'ACTIVE' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>

                  <div className="flex justify-between items-start mb-4 mt-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl ${record.vehicleType === VehicleType.MOTORCYCLE ? 'bg-orange-50 text-orange-600' :
                        record.vehicleType === VehicleType.ELECTRIC ? 'bg-yellow-50 text-yellow-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                        {getVehicleIcon(record.vehicleType)}
                      </div>
                      <div>
                        <h4 className="font-black text-xl text-slate-800 tracking-tight">{record.plate}</h4>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight -mt-1 mb-1">
                          ID: {record.ownerId || 'Ocasional'}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                          {record.status === 'ACTIVE' ? (
                            <span className="flex items-center gap-1 text-green-600"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Activo</span>
                          ) : (
                            <span className="text-slate-400">Finalizado</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {record.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleForceExit(record.id, record.plate)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                        title="Forzar Salida"
                      >
                        <LogOut size={18} />
                      </button>
                    )}
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Ubicación</p>
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <MapPin size={14} className="text-blue-500" />
                        {record.spotNumber || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Ingreso</p>
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 text-sm">
                        <Calendar size={14} className="text-blue-500" />
                        {new Date(record.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Accessibility Badge if needed */}
                  {record.isDisabled && (
                    <div className="flex items-center gap-2 mb-3 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold w-fit">
                      <Accessibility size={14} /> Acceso Preferencial
                    </div>
                  )}

                  {/* Details if any */}
                  {record.details && (
                    <div className="mb-3 text-xs text-slate-500 flex items-center gap-2">
                      <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                      {record.details.make} • {record.details.color}
                    </div>
                  )}

                  {/* Visual Time Bar */}
                  {record.status === 'ACTIVE' && (
                    <TimeProgressBar entryTime={record.entryTime} />
                  )}

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};