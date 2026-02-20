import React, { useState, useEffect } from 'react';
import { X, LayoutGrid, Car, Bike, Accessibility, Zap, LogOut, Plus, Trash2, Edit2, MapPin } from 'lucide-react';
import { ParkingLayoutMap } from './ParkingLayoutMap';
import { ParkingRecord, Floor } from '../types';

interface ParkingMapModalProps {
  records: ParkingRecord[];
  capacities: {
    REGULAR_CAR: number;
    PRIORITY_CAR: number;
    MOTO: number;
    EV_CHARGING: number;
  };
  floors?: Floor[];
  onClose: () => void;
  highlightedPlate?: string;
  onCapacityChange?: (newCapacities: { REGULAR_CAR: number; PRIORITY_CAR: number; MOTO: number; EV_CHARGING: number }) => void;
  onFloorsUpdate?: (floors: Floor[]) => void;
  allowEdit?: boolean;
  onManualExit?: (id: string) => void;
  isPublicView?: boolean;
  hideMapVisual?: boolean;
}

export const ParkingMapModal: React.FC<ParkingMapModalProps> = ({
  records,
  capacities,
  floors = [],
  onClose,
  highlightedPlate,
  onCapacityChange,
  onFloorsUpdate,
  allowEdit = false,
  onManualExit,
  isPublicView = false,
  hideMapVisual = false
}) => {
  // If floors are not provided (legacy), create a dummy floor wrapper around capacities
  const effectiveFloors = floors.length > 0 ? floors : [{
    id: 'default',
    name: 'Piso 1',
    capacities: capacities,
    prefixes: {
      REGULAR_CAR: 'C',
      PRIORITY_CAR: 'P',
      MOTO: 'M',
      EV_CHARGING: 'E'
    }
  }];

  const [selectedFloorId, setSelectedFloorId] = useState<string>(effectiveFloors[0].id);
  const [selectedSpot, setSelectedSpot] = useState<ParkingRecord | null>(null);
  const [editedCapacities, setEditedCapacities] = useState(capacities); // Fallback state

  // State for renaming floor
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Update selected floor when floors change (e.g. deletion)
  useEffect(() => {
    if (!effectiveFloors.find(f => f.id === selectedFloorId)) {
      setSelectedFloorId(effectiveFloors[0]?.id || '');
    }
  }, [floors]); // Depend on floors prop

  // Auto-switch to floor when highlightedPlate is provided
  useEffect(() => {
    if (highlightedPlate) {
      const record = records.find(r => r.plate === highlightedPlate && r.status === 'ACTIVE');
      if (record && record.floorId && record.floorId !== selectedFloorId) {
        setSelectedFloorId(record.floorId);
      }
    }
  }, [highlightedPlate, records]);

  const currentFloor = effectiveFloors.find(f => f.id === selectedFloorId) || effectiveFloors[0];

  const handleCapacityChange = (type: 'REGULAR_CAR' | 'PRIORITY_CAR' | 'MOTO' | 'EV_CHARGING', delta: number) => {
    if (!currentFloor) return;

    // Use current floor's capacities
    const newCapacities = { ...currentFloor.capacities };
    const newValue = newCapacities[type] + delta;

    if (newValue < 0 || newValue > 500) return;

    // Check active vehicles on THIS floor
    const activeCount = records.filter(r => {
      if (r.status !== 'ACTIVE' || !r.spotNumber) return false;
      // Filter by floor
      const recordFloorId = r.floorId || effectiveFloors[0].id; // Default to first floor if undefined
      if (recordFloorId !== currentFloor.id) return false;

      // Extract prefix from spotNumber (before the dash)
      const spotPrefix = r.spotNumber.split('-').slice(0, -1).join('-');
      const floorPrefix = currentFloor.prefixes[type];
      const isLegacyFloor = currentFloor.id === 'floor-1';
      const expectedPrefix = isLegacyFloor ? floorPrefix : `${currentFloor.name.replace(/\s/g, '')}-${floorPrefix}`;

      return spotPrefix === expectedPrefix;
    }).length;

    if (newValue < activeCount) {
      alert(`No puedes reducir la capacidad por debajo de ${activeCount} (vehículos actualmente estacionados en este tipo de puesto)`);
      return;
    }

    newCapacities[type] = newValue;

    // Update local state fallback
    setEditedCapacities(newCapacities);

    if (onFloorsUpdate && floors.length > 0) {
      const updatedFloors = floors.map(f => f.id === currentFloor.id ? { ...f, capacities: newCapacities } : f);
      onFloorsUpdate(updatedFloors);
    } else if (onCapacityChange) {
      onCapacityChange(newCapacities);
    }
  };

  const handlePrefixChange = (type: 'REGULAR_CAR' | 'PRIORITY_CAR' | 'MOTO' | 'EV_CHARGING', newPrefix: string) => {
    if (!currentFloor || !onFloorsUpdate) return;

    const floorsToUpdate = floors.length > 0 ? floors : effectiveFloors;
    const currentPrefixes = currentFloor.prefixes || {
      REGULAR_CAR: 'C',
      PRIORITY_CAR: 'P',
      MOTO: 'M',
      EV_CHARGING: 'E'
    };

    // Only block if we ARE changing away from a value that HAS active vehicles
    const oldPrefix = currentPrefixes[type];

    // Safety check: only if we're actually CHANGING the prefix and there are cars
    if (newPrefix !== oldPrefix) {
      const hasActiveVehicles = records.some(r => {
        if (r.status !== 'ACTIVE' || !r.spotNumber) return false;
        const recordFloorId = r.floorId || effectiveFloors[0].id;
        if (recordFloorId !== currentFloor.id) return false;

        const spotPrefix = r.spotNumber.split('-').slice(0, -1).join('-');
        const isLegacyFloor = currentFloor.id === 'floor-1';
        const expectedPrefix = isLegacyFloor ? oldPrefix : `${currentFloor.name.replace(/\s/g, '')}-${oldPrefix}`;

        return spotPrefix === expectedPrefix;
      });

      if (hasActiveVehicles) {
        alert("No puedes cambiar el prefijo mientras haya vehículos en esta zona. Libera los puestos primero.");
        return;
      }
    }

    const updatedFloors = floorsToUpdate.map(f => {
      if (f.id === currentFloor.id) {
        return {
          ...f,
          prefixes: {
            ...currentPrefixes,
            [type]: newPrefix
          }
        };
      }
      return f;
    });
    onFloorsUpdate(updatedFloors);
  };

  const handleAddFloor = () => {
    if (!onFloorsUpdate || !floors) return;
    const floorIndex = floors.length;
    const newFloor: Floor = {
      id: crypto.randomUUID(),
      name: `Piso ${floorIndex + 1}`,
      mapImageUrl: floorIndex === 1 ? '/piso2.png' : undefined,
      capacities: {
        REGULAR_CAR: 0,
        PRIORITY_CAR: 0,
        MOTO: 0,
        EV_CHARGING: 0
      },
      prefixes: {
        REGULAR_CAR: 'C',
        PRIORITY_CAR: 'P',
        MOTO: 'M',
        EV_CHARGING: 'E'
      }
    };
    onFloorsUpdate([...floors, newFloor]);
  };

  const handleRemoveFloor = (floorId: string) => {
    if (!onFloorsUpdate || !floors) return;
    const hasActiveCars = records.some(r => r.status === 'ACTIVE' && r.floorId === floorId);
    if (hasActiveCars) {
      alert('No se puede eliminar un piso con vehículos activos.');
      return;
    }
    if (confirm('¿Estás seguro de que quieres eliminar este piso?')) {
      onFloorsUpdate(floors.filter(f => f.id !== floorId));
    }
  };

  const startRenaming = (floor: Floor) => {
    setEditingFloorId(floor.id);
    setEditingName(floor.name);
  };

  const saveRenaming = () => {
    if (!onFloorsUpdate || !floors || !editingFloorId) return;
    const updatedFloors = floors.map(f => f.id === editingFloorId ? { ...f, name: editingName } : f);
    onFloorsUpdate(updatedFloors);
    setEditingFloorId(null);
  };

  const getRecordForSpot = (spotNum: string) => {
    // If we have selected a floor, only show spots for that floor
    return records.find(r => {
      const recordFloorId = r.floorId || effectiveFloors[0].id; // treat undefined as first floor
      return r.status === 'ACTIVE' && r.spotNumber === spotNum && recordFloorId === currentFloor.id;
    });
  };

  // Helper to get display prefix for grid generation
  const getDisplayPrefix = (prefixChar: string) => {
    if (!currentFloor) return prefixChar;
    const isLegacyFloor = currentFloor.id === 'floor-1';
    const prefixSuffix = isLegacyFloor ? '' : `${currentFloor.name.replace(/\s/g, '')}-`;
    return `${prefixSuffix}${prefixChar}`;
  };

  const renderGrid = (prefixChar: string, count: number, type: 'REGULAR' | 'PRIORITY' | 'MOTO' | 'EV') => {
    const spots = [];
    const displayPrefix = getDisplayPrefix(prefixChar);

    for (let i = 1; i <= count; i++) {
      // Construct the expected Spot ID
      const spotNum = `${displayPrefix}-${i.toString().padStart(3, '0')}`;

      const record = getRecordForSpot(spotNum);
      const isOccupied = !!record;
      const isHighlighted = highlightedPlate && record?.plate === highlightedPlate;

      // Privacy: If public view, only allow seeing details if it's the highlighted car (user's car)
      const canViewDetails = !isPublicView || isHighlighted;

      let bgClass = "bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200";
      if (isOccupied) {
        if (isHighlighted) {
          bgClass = "bg-yellow-400 border-yellow-500 text-yellow-900 shadow-lg shadow-yellow-300 animate-pulse";
        } else if (type === 'PRIORITY') {
          bgClass = "bg-blue-600 border-blue-700 text-white shadow-md shadow-blue-200";
        } else if (type === 'MOTO') {
          bgClass = "bg-orange-500 border-orange-600 text-white shadow-md shadow-orange-200";
        } else if (type === 'EV') {
          bgClass = "bg-green-500 border-green-600 text-white shadow-md shadow-green-200";
        } else {
          bgClass = "bg-red-500 border-red-600 text-white shadow-md shadow-red-200";
        }
      }

      const tooltip = isOccupied
        ? (canViewDetails ? `Ocupado por: ${record.plate}` : 'Ocupado')
        : 'Disponible';

      spots.push(
        <button
          key={spotNum}
          onClick={() => isOccupied && canViewDetails && setSelectedSpot(record)}
          disabled={!isOccupied || (isOccupied && !canViewDetails)}
          className={`h-10 w-10 md:h-12 md:w-12 rounded-lg border flex flex-col items-center justify-center text-[10px] md:text-xs font-bold transition-all ${bgClass} ${isOccupied && canViewDetails ? 'cursor-pointer transform hover:scale-105' : 'cursor-default'}`}
          title={tooltip}
        >
          {isOccupied ? (
            type === 'MOTO' ? <Bike size={16} /> :
              type === 'PRIORITY' ? <Accessibility size={16} /> :
                type === 'EV' ? <Zap size={16} /> :
                  <Car size={16} />
          ) : (
            <span>{i}</span>
          )}
        </button>
      );
    }
    return spots;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">

        {/* Header */}
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold">Dashboard de Ocupación</h3>
              <p className="text-xs text-slate-400">Visualización en tiempo real</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content with Sidebar */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden bg-[#0F172A]">

          {/* Sidebar / Floor Selector */}
          <div className="w-full md:w-72 bg-[#1E293B] border-b md:border-b-0 md:border-r border-slate-700/50 flex flex-col shrink-0 max-h-48 md:max-h-full transition-all">
            <div className="p-6 border-b border-slate-700/30 bg-[#1E293B]">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Niveles</h4>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {effectiveFloors.map((floor, index) => (
                <div
                  key={floor.id}
                  className={`group relative p-4 rounded-2xl cursor-pointer transition-all border ${selectedFloorId === floor.id
                    ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                    : 'bg-slate-800/40 border-transparent hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  onClick={() => setSelectedFloorId(floor.id)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors ${selectedFloorId === floor.id ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
                        }`}>
                        {index + 1}
                      </div>
                      <div className="flex flex-col">
                        {editingFloorId === floor.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={saveRenaming}
                            onKeyDown={(e) => e.key === 'Enter' && saveRenaming()}
                            className="bg-slate-900 border border-blue-500 rounded px-2 py-1 text-sm text-white outline-none w-32"
                            autoFocus
                          />
                        ) : (
                          <>
                            <span className={`font-bold text-sm ${selectedFloorId === floor.id ? 'text-white' : 'text-slate-300'}`}>
                              {floor.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                              {Object.values(floor.capacities).reduce((a, b) => a + b, 0)} Puestos Totales
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {allowEdit && floors.length > 0 && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); startRenaming(floor); }}
                          className="p-1.5 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveFloor(floor.id); }}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {allowEdit && onFloorsUpdate && (
                <button
                  onClick={handleAddFloor}
                  className="w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-slate-500 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-500/5 transition-all group"
                >
                  <Plus size={18} className="group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-sm uppercase tracking-widest">Añadir Nivel</span>
                </button>
              )}
            </div>

            {/* Legend Footer in Sidebar */}
            <div className="p-6 border-t border-slate-700/30 bg-[#1E293B]/50">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#7DBA2A]"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disponible</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ocupado</span>
                </div>
                {highlightedPlate && (
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Búsqueda: {highlightedPlate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid Area */}
          <div className="flex-1 overflow-y-auto bg-[#0F172A] relative custom-scrollbar">

            <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 h-full">
              {!hideMapVisual ? (
                <div className="h-full flex flex-col">
                  <div className="flex items-end justify-between mb-6">
                    <div>
                      <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-2">
                        Mapa del <span className="text-blue-500">Parqueadero</span>
                      </h2>
                      <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.2em]">
                        Localización en Tiempo Real • {currentFloor?.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 bg-slate-900 rounded-[2.5rem] overflow-hidden border-8 border-slate-800/50 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative">
                    <ParkingLayoutMap
                      records={records}
                      highlightedSpot={highlightedPlate}
                      interactive={!isPublicView}
                      showOnlyHighlighted={isPublicView}
                      mapImageUrl={currentFloor?.mapImageUrl}
                      floorId={currentFloor?.id}
                      floorName={currentFloor?.name}
                      showPlates={!isPublicView}
                      capacities={currentFloor?.capacities}
                      prefixes={currentFloor?.prefixes}
                    />
                  </div>
                </div>
              ) : (
                /* legacy grid layout when hideMapVisual is true */
                <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700 shadow-xl overflow-hidden">
                  {currentFloor && (
                    <div className="space-y-10">
                      {(['REGULAR_CAR', 'PRIORITY_CAR', 'MOTO', 'EV_CHARGING'] as const).map(type => {
                        const typeLabel = type === 'REGULAR_CAR' ? 'Zona General' :
                          type === 'PRIORITY_CAR' ? 'Zona Prioritaria' :
                            type === 'MOTO' ? 'Zona Motos' : 'Zona Carga Eléctrica';
                        const typeKey = type.split('_')[0] as 'REGULAR' | 'PRIORITY' | 'MOTO' | 'EV';
                        return (
                          <div key={type} className="space-y-4">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">{typeLabel}</h4>
                            <div className="flex flex-wrap gap-2">
                              {renderGrid(currentFloor.prefixes[type], currentFloor.capacities[type], typeKey === 'EV' ? 'EV' : (type.split('_')[0] as any))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Legacy Capacity Controls (Visible only if allowEdit) */}
              {allowEdit && (
                <div className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-md">
                  <h4 className="text-sm font-black text-white mb-6 uppercase tracking-widest">Configuración de Capacidades - {currentFloor?.name}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(['REGULAR_CAR', 'PRIORITY_CAR', 'MOTO', 'EV_CHARGING'] as const).map(type => (
                      <div key={type} className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition-colors group">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`p-2 rounded-lg ${type === 'REGULAR_CAR' ? 'bg-slate-700' :
                            type === 'PRIORITY_CAR' ? 'bg-blue-500/20 text-blue-400' :
                              type === 'MOTO' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                            {type === 'REGULAR_CAR' && <Car size={18} />}
                            {type === 'PRIORITY_CAR' && <Accessibility size={18} />}
                            {type === 'MOTO' && <Bike size={18} />}
                            {type === 'EV_CHARGING' && <Zap size={18} />}
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{type.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <input
                            type="number"
                            value={currentFloor?.capacities[type] || 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const currentVal = currentFloor?.capacities[type] || 0;
                              handleCapacityChange(type, val - currentVal);
                            }}
                            className="w-full text-3xl font-black text-white bg-transparent border-b-2 border-slate-700 focus:border-blue-500 outline-none transition-colors"
                          />
                          <div className="flex flex-col gap-1">
                            <button onClick={() => handleCapacityChange(type, 1)} className="p-1 hover:bg-slate-700 rounded-lg text-white transition-colors">
                              <Plus size={14} />
                            </button>
                            <button onClick={() => handleCapacityChange(type, -1)} className="p-1 hover:bg-slate-700 rounded-lg text-white transition-colors">
                              <LogOut size={14} className="rotate-90" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Popover - Modernized */}
      {selectedSpot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-[#1E293B] p-8 rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] border border-slate-700/50 pointer-events-auto w-80 animate-fade-in-up">
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Información del Puesto</span>
                <h3 className="text-4xl font-black text-white tracking-widest leading-none">
                  {selectedSpot.spotNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSpot(null)}
                className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Vehículo Registrado</p>
                <p className="text-2xl font-black text-white tracking-widest uppercase">{selectedSpot.plate}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Dueño</p>
                  <p className="font-bold text-slate-200 text-xs">{selectedSpot.ownerId || 'N/A'}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Entrada</p>
                  <p className="font-bold text-slate-200 text-xs">{new Date(selectedSpot.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            {onManualExit && (
              <button
                onClick={() => {
                  if (window.confirm(`¿Liberar puesto ${selectedSpot.spotNumber} y forzar salida de ${selectedSpot.plate}?`)) {
                    onManualExit(selectedSpot.id);
                    setSelectedSpot(null);
                  }
                }}
                className="w-full py-4 bg-red-500 hover:bg-red-400 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <LogOut size={16} /> Liberar Puesto
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};