import React, { useState, useEffect } from 'react';
import { X, LayoutGrid, Car, Bike, Accessibility, Zap, LogOut, Plus, Trash2, Edit2 } from 'lucide-react';
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
  isPublicView = false
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
    const newFloor: Floor = {
      id: crypto.randomUUID(),
      name: `Piso ${floors.length + 1}`,
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
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

          {/* Sidebar / Floor Selector */}
          <div className="w-full md:w-64 bg-slate-100 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col shrink-0 max-h-48 md:max-h-full">
            <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <h4 className="font-bold text-gray-700">Pisos</h4>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {effectiveFloors.map(floor => (
                <div
                  key={floor.id}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedFloorId === floor.id ? 'bg-white border-blue-500 shadow-md transform scale-[1.02]' : 'bg-transparent border-transparent hover:bg-gray-200'}`}
                  onClick={() => setSelectedFloorId(floor.id)}
                >
                  <div className="flex justify-between items-center group">
                    {editingFloorId === floor.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={saveRenaming}
                        onKeyDown={(e) => e.key === 'Enter' && saveRenaming()}
                        className="w-full bg-white border border-blue-300 rounded px-1 text-sm"
                        autoFocus
                      />
                    ) : (
                      <span className={`font-medium ${selectedFloorId === floor.id ? 'text-blue-700' : 'text-gray-600'}`}>
                        {floor.name}
                      </span>
                    )}

                    {allowEdit && floors.length > 0 && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); startRenaming(floor); }}
                          className="p-1 hover:bg-blue-100 rounded text-blue-600"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveFloor(floor.id); }}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Mini Capacity Summary */}
                  <div className="mt-2 flex gap-2 text-[10px] text-gray-400">
                    <span>Total: {Object.values(floor.capacities).reduce((a, b) => a + b, 0)}</span>
                  </div>
                </div>
              ))}

              {allowEdit && onFloorsUpdate && (
                <button
                  onClick={handleAddFloor}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  <Plus size={16} /> Nuevo Piso
                </button>
              )}
            </div>
          </div>

          {/* Grid Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-8 bg-white p-3 rounded-xl border border-gray-200 shadow-sm justify-center">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></div> Libre
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <div className="w-4 h-4 bg-red-500 rounded"></div> Ocupado (Carro)
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <div className="w-4 h-4 bg-blue-600 rounded"></div> Prioridad
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <div className="w-4 h-4 bg-green-500 rounded"></div> Eléctrico
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <div className="w-4 h-4 bg-orange-500 rounded"></div> Moto
              </div>
            </div>

            {currentFloor && (
              <div className="flex flex-col gap-6">

                {/* Left Col: Priority, Moto, EV */}
                <div className="space-y-6">

                  {/* Priority Section */}
                  <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4 border-b border-blue-50 pb-2">
                      <h4 className="flex items-center gap-2 font-bold text-blue-800">
                        <Accessibility size={20} /> Zona Prioritaria
                      </h4>
                      <div className="flex items-center gap-2">
                        {allowEdit && (
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-gray-400 uppercase font-bold">Prefijo</span>
                              <input
                                type="text"
                                value={currentFloor.prefixes?.PRIORITY_CAR ?? ''}
                                onChange={(e) => handlePrefixChange('PRIORITY_CAR', e.target.value)}
                                className="w-10 h-6 border rounded text-xs text-center font-bold text-blue-600 focus:ring-1 focus:ring-blue-400 outline-none"
                                maxLength={3}
                              />
                            </div>
                            <div className="w-[1px] h-8 bg-gray-100 mx-1"></div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-gray-400 uppercase font-bold">Cupos</span>
                              <div className="flex items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={currentFloor.capacities.PRIORITY_CAR}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      handleCapacityChange('PRIORITY_CAR', val - currentFloor.capacities.PRIORITY_CAR);
                                    }}
                                    className="w-16 h-6 text-center border rounded text-sm font-bold text-blue-800 focus:ring-1 focus:ring-blue-400 outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {!allowEdit && <span className="text-sm font-bold text-blue-600">{currentFloor.capacities.PRIORITY_CAR} Cupos ({currentFloor.prefixes?.PRIORITY_CAR || 'P'})</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {renderGrid(currentFloor.prefixes?.PRIORITY_CAR || 'P', currentFloor.capacities.PRIORITY_CAR, 'PRIORITY')}
                    </div>
                  </div>

                  {/* EV Section */}
                  <div className="bg-white p-5 rounded-2xl border border-green-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4 border-b border-green-50 pb-2">
                      <h4 className="flex items-center gap-2 font-bold text-green-800">
                        <Zap size={20} /> Zona Carga Eléctrica
                      </h4>
                      <div className="flex items-center gap-2">
                        {allowEdit && (
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-gray-400 uppercase font-bold">Prefijo</span>
                              <input
                                type="text"
                                value={currentFloor.prefixes?.EV_CHARGING ?? ''}
                                onChange={(e) => handlePrefixChange('EV_CHARGING', e.target.value)}
                                className="w-10 h-6 border rounded text-xs text-center font-bold text-green-600 focus:ring-1 focus:ring-green-400 outline-none"
                                maxLength={3}
                              />
                            </div>
                            <div className="w-[1px] h-8 bg-gray-100 mx-1"></div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-gray-400 uppercase font-bold">Cupos</span>
                              <div className="flex items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={currentFloor.capacities.EV_CHARGING}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      handleCapacityChange('EV_CHARGING', val - currentFloor.capacities.EV_CHARGING);
                                    }}
                                    className="w-16 h-6 text-center border rounded text-sm font-bold text-green-800 focus:ring-1 focus:ring-green-400 outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {!allowEdit && <span className="text-sm font-bold text-green-600">{currentFloor.capacities.EV_CHARGING} Cupos ({currentFloor.prefixes?.EV_CHARGING || 'E'})</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {renderGrid(currentFloor.prefixes?.EV_CHARGING || 'E', currentFloor.capacities.EV_CHARGING, 'EV')}
                    </div>
                  </div>

                  {/* Moto Section */}
                  <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4 border-b border-orange-50 pb-2">
                      <h4 className="flex items-center gap-2 font-bold text-orange-800">
                        <Bike size={20} /> Zona Motos
                      </h4>
                      <div className="flex items-center gap-2">
                        {allowEdit && (
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-gray-400 uppercase font-bold">Prefijo</span>
                              <input
                                type="text"
                                value={currentFloor.prefixes?.MOTO ?? ''}
                                onChange={(e) => handlePrefixChange('MOTO', e.target.value)}
                                className="w-10 h-6 border rounded text-xs text-center font-bold text-orange-600 focus:ring-1 focus:ring-orange-400 outline-none"
                                maxLength={3}
                              />
                            </div>
                            <div className="w-[1px] h-8 bg-gray-100 mx-1"></div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-gray-400 uppercase font-bold">Cupos</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={currentFloor.capacities.MOTO}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    handleCapacityChange('MOTO', val - currentFloor.capacities.MOTO);
                                  }}
                                  className="w-16 h-6 text-center border rounded text-sm font-bold text-orange-800 focus:ring-1 focus:ring-orange-400 outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        {!allowEdit && <span className="text-sm font-bold text-orange-600">{currentFloor.capacities.MOTO} Cupos ({currentFloor.prefixes?.MOTO || 'M'})</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {renderGrid(currentFloor.prefixes?.MOTO || 'M', currentFloor.capacities.MOTO, 'MOTO')}
                    </div>
                  </div>
                </div>

                {/* Right Col: Regular Cars */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2 shrink-0">
                    <h4 className="flex items-center gap-2 font-bold text-gray-800">
                      <Car size={20} /> Zona General
                    </h4>
                    <div className="flex items-center gap-2">
                      {allowEdit && (
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Prefijo</span>
                            <input
                              type="text"
                              value={currentFloor.prefixes?.REGULAR_CAR ?? ''}
                              onChange={(e) => handlePrefixChange('REGULAR_CAR', e.target.value)}
                              className="w-10 h-6 border rounded text-xs text-center font-bold text-gray-600 focus:ring-1 focus:ring-blue-400 outline-none"
                              maxLength={3}
                            />
                          </div>
                          <div className="w-[1px] h-8 bg-gray-100 mx-1"></div>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Cupos</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={currentFloor.capacities.REGULAR_CAR}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  handleCapacityChange('REGULAR_CAR', val - currentFloor.capacities.REGULAR_CAR);
                                }}
                                className="w-16 h-6 text-center border rounded text-sm font-bold text-gray-800 focus:ring-1 focus:ring-blue-400 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      {!allowEdit && <span className="text-sm font-bold text-gray-600">{currentFloor.capacities.REGULAR_CAR} Cupos ({currentFloor.prefixes?.REGULAR_CAR || 'C'})</span>}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex flex-wrap gap-2 justify-center content-start">
                      {renderGrid(currentFloor.prefixes?.REGULAR_CAR || 'C', currentFloor.capacities.REGULAR_CAR, 'REGULAR')}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Popover */}
      {selectedSpot && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border-2 border-slate-900 pointer-events-auto w-72 animate-bounce-in relative">
            <button
              onClick={() => setSelectedSpot(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>

            <div className="text-center">
              <div className="text-4xl font-black text-slate-800 mb-1">{selectedSpot.spotNumber}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Información del Puesto</div>

              <div className="space-y-3 text-left bg-gray-50 p-3 rounded-xl mb-4">
                <div>
                  <p className="text-xs text-gray-400">Placa</p>
                  <p className="font-bold text-lg text-gray-900">{selectedSpot.plate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Propietario</p>
                  <p className="font-medium text-gray-700 text-sm">{selectedSpot.ownerId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Entrada</p>
                  <p className="font-medium text-gray-700 text-sm">
                    {new Date(selectedSpot.entryTime).toLocaleTimeString()}
                  </p>
                </div>
                {/* Show Floor info in details */}
                <div>
                  <p className="text-xs text-gray-400">Ubicación</p>
                  <p className="font-medium text-gray-700 text-sm">
                    {currentFloor.name}
                  </p>
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
                  className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut size={16} /> Liberar Puesto
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};