import React, { useState, useMemo } from 'react';
import { Car, Bike, Accessibility, Zap, ArrowRight, ArrowLeft, X, Info } from 'lucide-react';
import { ParkingRecord, VehicleType } from '../types';

interface ParkingLayoutMapProps {
    highlightedSpot?: string;
    isEntryAssignment?: boolean;
    records?: ParkingRecord[];
    interactive?: boolean;
    showOnlyHighlighted?: boolean;
    mapImageUrl?: string;
    floorId?: string;
    showPlates?: boolean;
}

/**
 * A refined top-down parking lot map with real-time occupancy and interactivity.
 */
export const ParkingLayoutMap: React.FC<ParkingLayoutMapProps> = ({
    highlightedSpot,
    isEntryAssignment,
    records = [],
    interactive = false,
    showOnlyHighlighted = false,
    mapImageUrl,
    floorId,
    showPlates = false
}) => {
    const [selectedSpot, setSelectedSpot] = useState<string | null>(null);

    // Define zones and their grid logical positions based on floor
    const spots = useMemo(() => {
        const isFloor1 = !floorId || floorId === 'default' || floorId === 'floor-1';

        if (isFloor1) {
            return [
                // Top Row stalls
                ...Array.from({ length: 5 }, (_, i) => ({ id: `P-00${i + 1}`, type: 'PRIORITY', rotation: 'top' })),
                ...Array.from({ length: 3 }, (_, i) => ({ id: `C-01${i + 1}`, type: 'REGULAR', rotation: 'top' })),
                // Bottom Row stalls
                ...Array.from({ length: 5 }, (_, i) => ({ id: `E-00${i + 1}`, type: 'EV', rotation: 'bottom' })),
                ...Array.from({ length: 3 }, (_, i) => ({ id: `C-00${i + 1}`, type: 'REGULAR', rotation: 'bottom' })),
                // Moto stalls (Right side)
                ...Array.from({ length: 4 }, (_, i) => ({ id: `M-00${i + 1}`, type: 'MOTO', rotation: 'right' })),
            ];
        } else {
            // Piso 2 / Courtyard layout (U shape/Perimeter)
            return [
                // Top Edge
                ...Array.from({ length: 6 }, (_, i) => ({ id: `C-00${i + 1}`, type: 'REGULAR', rotation: 'top' })),
                ...Array.from({ length: 4 }, (_, i) => ({ id: `P-00${i + 1}`, type: 'PRIORITY', rotation: 'top' })),
                // Left Edge
                ...Array.from({ length: 4 }, (_, i) => ({ id: `M-01${i + 1}`, type: 'MOTO', rotation: 'left' })),
                // Right Edge
                ...Array.from({ length: 4 }, (_, i) => ({ id: `E-00${i + 1}`, type: 'EV', rotation: 'right' })),
                // Bottom Edge
                ...Array.from({ length: 5 }, (_, i) => ({ id: `M-00${i + 1}`, type: 'MOTO', rotation: 'bottom' })),
            ];
        }
    }, [floorId]);

    const getNormalizedId = (fullId: string) => {
        const parts = fullId.split('-');
        return parts.slice(-2).join('-');
    };

    const normalizedHighlight = useMemo(() => {
        if (!highlightedSpot) return null;

        // Check if the highlightedSpot is a plate in our records
        const recordByPlate = records.find(r => r.plate === highlightedSpot && r.status === 'ACTIVE');
        if (recordByPlate && recordByPlate.spotNumber) {
            // Check if floor matches if floorId is provided
            if (floorId && recordByPlate.floorId && recordByPlate.floorId !== floorId) {
                return null;
            }
            return getNormalizedId(recordByPlate.spotNumber);
        }

        // Otherwise treat it as a normalized spot ID
        return getNormalizedId(highlightedSpot);
    }, [highlightedSpot, records, floorId]);

    // Find record for a spot
    const getRecordForSpot = (spotId: string) => {
        const record = records.find(r => {
            const matchesSpot = getNormalizedId(r.spotNumber || '') === spotId;
            const matchesFloor = !floorId || (r.floorId || 'default') === floorId;
            return r.status === 'ACTIVE' && matchesSpot && matchesFloor;
        });

        if (showOnlyHighlighted && record) {
            const isMatch = normalizedHighlight === getNormalizedId(record.spotNumber || '');
            return isMatch ? record : null;
        }
        return record;
    };

    const handleSpotClick = (spotId: string) => {
        if (!interactive) return;
        setSelectedSpot(selectedSpot === spotId ? null : spotId);
    };

    const selectedRecord = selectedSpot ? getRecordForSpot(selectedSpot) : null;

    return (
        <div className="relative w-full aspect-[16/9] bg-[#5D5D6E] rounded-2xl overflow-hidden shadow-inner border-4 border-slate-700 select-none">
            {mapImageUrl ? (
                <div className="absolute inset-0 w-full h-full">
                    <img src={mapImageUrl} alt="Parking Map" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-slate-900/40"></div>
                </div>
            ) : (
                <>
                    {/* Top Green Border (Grass) */}
                    <div className="absolute top-0 left-0 right-0 h-[10%] bg-[#7DBA2A] border-b-4 border-[#6AA024] flex items-center px-4">
                        {/* Tree Top-Left */}
                        <div className="absolute top-1 left-2 w-16 h-16 bg-[#4A7C18] rounded-full shadow-lg border-2 border-[#3D6614] flex items-center justify-center">
                            <div className="w-12 h-12 bg-[#5E9422] rounded-full border border-[#4A7C18]"></div>
                            <div className="absolute w-2 h-2 bg-yellow-200/20 rounded-full top-3 left-4"></div>
                        </div>
                    </div>

                    {/* Bottom Green Border (Grass) */}
                    <div className="absolute bottom-0 left-0 right-0 h-[10%] bg-[#7DBA2A] border-t-4 border-[#6AA024]">
                        {/* Decorative Plants Bottom-Left */}
                        <div className="absolute bottom-1 left-4 flex gap-1">
                            <div className="w-8 h-8 bg-[#4A7C18] rounded-full shadow-md border border-[#3D6614]"></div>
                            <div className="w-6 h-6 bg-[#4A7C18] rounded-full shadow-md border border-[#3D6614] -mt-2"></div>
                        </div>
                    </div>
                </>
            )}

            {/* Parking Area Container */}
            <div className="absolute inset-[10%] p-4 flex flex-col justify-between">

                {/* Top Stall Row */}
                <div className="flex gap-1 h-[35%] relative">
                    <div className="w-[20%] flex items-center justify-center">
                        {/* Empty Entrance Space */}
                    </div>
                    <div className="flex-1 flex gap-0.5">
                        {spots.filter(s => s.rotation === 'top').map(spot => {
                            const isHighlight = normalizedHighlight === spot.id;
                            const record = getRecordForSpot(spot.id);
                            const isOccupied = !!record;
                            const isSelected = selectedSpot === spot.id;

                            return (
                                <div
                                    key={spot.id}
                                    onClick={() => handleSpotClick(spot.id)}
                                    className={`flex-1 border-x border-b border-white/60 relative flex items-center justify-center transition-all cursor-pointer hover:bg-white/10 ${isHighlight ? 'bg-emerald-500/40 animate-neon-pulse z-10' :
                                        isOccupied ? 'bg-red-500/30' : ''
                                        } ${isSelected ? 'ring-2 ring-yellow-400 z-20 bg-yellow-400/20' : ''}`}
                                >
                                    {isOccupied ? (
                                        <div className="flex flex-col items-center gap-0.5">
                                            <Car size={14} className={`${record.vehicleType === VehicleType.MOTORCYCLE ? 'text-orange-400' : 'text-slate-200'}`} />
                                            {showPlates && (
                                                <span className="bg-white/80 text-slate-900 border border-slate-900 px-0.5 rounded-[1px] text-[5px] font-black leading-none">
                                                    {record.plate}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        spot.type === 'PRIORITY' ? <div className="border-2 border-white/60 p-1 rounded text-white font-bold opacity-30 text-[8px]">P</div> : null
                                    )}
                                    {isHighlight && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_#34d399]"></div>}
                                    <span className="absolute bottom-1 text-[6px] text-white/30 font-bold">{spot.id}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Central Driveway */}
                <div className="flex-1 flex items-center px-12 relative">
                    {/* Directional Arrows */}
                    <div className="absolute left-6 flex flex-col gap-8 opacity-60">
                        <div className="flex items-center gap-2 text-white">
                            <ArrowLeft size={32} strokeWidth={3} />
                        </div>
                        <div className="flex items-center gap-2 text-white">
                            <ArrowRight size={32} strokeWidth={3} />
                        </div>
                    </div>

                    {/* Central Lane Markings */}
                    <div className="w-full h-0 border-t-2 border-dashed border-white/20"></div>

                    {/* Left/Right Vertical Rows for Courtyard Layout */}
                    <div className="absolute inset-0 flex justify-between pointer-events-none">
                        <div className="w-[10%] flex flex-col gap-1 items-center justify-center p-1 pointer-events-auto">
                            {spots.filter(s => s.rotation === 'left').map(spot => {
                                const isHighlight = normalizedHighlight === spot.id;
                                const record = getRecordForSpot(spot.id);
                                const isOccupied = !!record;
                                const isSelected = selectedSpot === spot.id;
                                return (
                                    <div
                                        key={spot.id}
                                        onClick={() => handleSpotClick(spot.id)}
                                        className={`w-full aspect-[4/3] border-y border-r border-white/60 relative flex items-center justify-center transition-all cursor-pointer hover:bg-white/10 ${isHighlight ? 'bg-emerald-500/40 animate-neon-pulse z-10' : isOccupied ? 'bg-red-500/30' : ''} ${isSelected ? 'ring-2 ring-yellow-400 z-20 bg-yellow-400/20' : ''}`}
                                    >
                                        {isOccupied ? (
                                            <div className="flex flex-col items-center gap-0.5">
                                                <Car size={12} className={`${record.vehicleType === VehicleType.MOTORCYCLE ? 'text-orange-400' : 'text-slate-200'}`} />
                                                {showPlates && (
                                                    <span className="bg-white/80 text-slate-900 border border-slate-900 px-0.5 rounded-[1px] text-[4px] font-black leading-none">
                                                        {record.plate}
                                                    </span>
                                                )}
                                            </div>
                                        ) : null}
                                        <span className="absolute left-0.5 text-[5px] text-white/30 font-bold -rotate-90">{spot.id}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="w-[10%] flex flex-col gap-1 items-center justify-center p-1 pointer-events-auto">
                            {spots.filter(s => s.rotation === 'right').map(spot => {
                                const isHighlight = normalizedHighlight === spot.id;
                                const record = getRecordForSpot(spot.id);
                                const isOccupied = !!record;
                                const isSelected = selectedSpot === spot.id;
                                return (
                                    <div
                                        key={spot.id}
                                        onClick={() => handleSpotClick(spot.id)}
                                        className={`w-full aspect-[4/3] border-y border-l border-white/60 relative flex items-center justify-center transition-all cursor-pointer hover:bg-white/10 ${isHighlight ? 'bg-emerald-500/40 animate-neon-pulse z-10' : isOccupied ? 'bg-red-500/30' : ''} ${isSelected ? 'ring-2 ring-yellow-400 z-20 bg-yellow-400/20' : ''}`}
                                    >
                                        {isOccupied ? (
                                            <div className="flex flex-col items-center gap-0.5">
                                                <Car size={12} className={`${record.vehicleType === VehicleType.MOTORCYCLE ? 'text-orange-400' : 'text-slate-200'}`} />
                                                {showPlates && (
                                                    <span className="bg-white/80 text-slate-900 border border-slate-900 px-0.5 rounded-[1px] text-[4px] font-black leading-none">
                                                        {record.plate}
                                                    </span>
                                                )}
                                            </div>
                                        ) : null}
                                        <span className="absolute right-0.5 text-[5px] text-white/30 font-bold rotate-90">{spot.id}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Bottom Stall Row */}
                <div className="flex gap-1 h-[35%]">
                    <div className="w-[20%]"></div>
                    <div className="flex-1 flex gap-0.5">
                        {spots.filter(s => s.rotation === 'bottom').map(spot => {
                            const isHighlight = normalizedHighlight === spot.id;
                            const record = getRecordForSpot(spot.id);
                            const isOccupied = !!record;
                            const isSelected = selectedSpot === spot.id;

                            return (
                                <div
                                    key={spot.id}
                                    onClick={() => handleSpotClick(spot.id)}
                                    className={`flex-1 border-x border-t border-white/60 relative flex items-center justify-center transition-all cursor-pointer hover:bg-white/10 ${isHighlight ? 'bg-emerald-500/40 animate-neon-pulse z-10' :
                                        isOccupied ? 'bg-red-500/30' : ''
                                        } ${isSelected ? 'ring-2 ring-yellow-400 z-20 bg-yellow-400/20' : ''}`}
                                >
                                    {isOccupied ? (
                                        <div className="flex flex-col items-center gap-0.5">
                                            <Car size={14} className={`${record.vehicleType === VehicleType.MOTORCYCLE ? 'text-orange-400' : 'text-slate-200'}`} />
                                            {showPlates && (
                                                <span className="bg-white/80 text-slate-900 border border-slate-900 px-0.5 rounded-[1px] text-[5px] font-black leading-none">
                                                    {record.plate}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        spot.type === 'EV' ? <Zap size={16} className="text-white/20" /> : null
                                    )}
                                    {isHighlight && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_#34d399]"></div>}
                                    <span className="absolute top-1 text-[6px] text-white/30 font-bold">{spot.id}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* Spot Info Popup */}
            {selectedSpot && interactive && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-50 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400">
                                <Info size={16} />
                            </div>
                            <h4 className="font-bold text-white text-sm">Detalles del Puesto: {selectedSpot}</h4>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedSpot(null); }} className="text-slate-500 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>

                    {selectedRecord ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                                <span className="text-[10px] text-slate-500 uppercase font-black">Placa</span>
                                <span className="text-xl font-black text-white tracking-widest">{selectedRecord.plate}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                                <span className="text-[10px] text-slate-500 uppercase font-black">Cédula Dueño</span>
                                <span className="font-bold text-slate-200">{selectedRecord.ownerId || 'Ocasional'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 uppercase font-black">Ingreso</span>
                                <span className="text-xs text-slate-300">{new Date(selectedRecord.entryTime).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="py-4 text-center">
                            <p className="text-emerald-400 font-bold">Puesto Disponible</p>
                            <p className="text-slate-500 text-[10px]">No hay vehículos registrados en este espacio</p>
                        </div>
                    )}
                </div>
            )}

            {/* Legend Overlay */}
            <div className="absolute top-2 right-4 flex gap-4 text-[8px] font-bold text-white/50 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full uppercase tracking-widest border border-white/10">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#7DBA2A]"></div> Libre
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div> Ocupado
                </div>
                {highlightedSpot && (
                    <div className="flex items-center gap-1 text-emerald-400 animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Asignado: {highlightedSpot}
                    </div>
                )}
            </div>

        </div>
    );
};
