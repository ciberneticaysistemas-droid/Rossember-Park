import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Car, Bike, Accessibility, Zap, X, Move, Maximize, Target, LayoutDashboard, Database, MapPin } from 'lucide-react';
import { ParkingRecord, VehicleType } from '../types';

interface ParkingLayoutMapProps {
    highlightedSpot?: string;
    records?: ParkingRecord[];
    interactive?: boolean;
    showOnlyHighlighted?: boolean;
    floorId?: string;
    floorName?: string;
    showPlates?: boolean;
    capacities?: {
        REGULAR_CAR: number;
        PRIORITY_CAR: number;
        MOTO: number;
        EV_CHARGING: number;
    };
    prefixes?: {
        REGULAR_CAR: string;
        PRIORITY_CAR: string;
        MOTO: string;
        EV_CHARGING: string;
    };
}

/**
 * ARCHITECTURAL BLUEPRINT PARKING MAP
 * High-precision, sober design with technical aesthetic.
 */
export const ParkingLayoutMap: React.FC<ParkingLayoutMapProps> = ({
    highlightedSpot,
    records = [],
    interactive = false,
    showOnlyHighlighted = false,
    floorId,
    floorName,
    showPlates = false,
    capacities,
    prefixes
}) => {
    const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);

    // Dynamic Spot Generation
    const spots = useMemo(() => {
        const caps = capacities || { REGULAR_CAR: 20, PRIORITY_CAR: 4, MOTO: 10, EV_CHARGING: 4 };
        const prefs = prefixes || { REGULAR_CAR: 'C', PRIORITY_CAR: 'P', MOTO: 'M', EV_CHARGING: 'E' };

        const result: any[] = [];

        // 1. Priority Row (Top Left)
        for (let i = 1; i <= caps.PRIORITY_CAR; i++) {
            result.push({ id: `${prefs.PRIORITY_CAR}-${i.toString().padStart(3, '0')}`, type: 'PRIORITY', row: 'top' });
        }

        // 2. Regular Car Top Row
        const regularTop = Math.ceil(caps.REGULAR_CAR / 2);
        for (let i = 1; i <= regularTop; i++) {
            result.push({ id: `${prefs.REGULAR_CAR}-${i.toString().padStart(3, '0')}`, type: 'REGULAR', row: 'top' });
        }

        // 3. EV Row (Bottom Left)
        for (let i = 1; i <= caps.EV_CHARGING; i++) {
            result.push({ id: `${prefs.EV_CHARGING}-${i.toString().padStart(3, '0')}`, type: 'EV', row: 'bottom' });
        }

        // 4. Regular Car Bottom Row
        for (let i = regularTop + 1; i <= caps.REGULAR_CAR; i++) {
            result.push({ id: `${prefs.REGULAR_CAR}-${i.toString().padStart(3, '0')}`, type: 'REGULAR', row: 'bottom' });
        }

        // 5. Moto Lane (Right Side Vertical or Extra Row)
        // To avoid overlap, we'll give Motos their own "block" or side lanes
        for (let i = 1; i <= caps.MOTO; i++) {
            result.push({ id: `${prefs.MOTO}-${i.toString().padStart(3, '0')}`, type: 'MOTO', row: 'side' });
        }

        return result;
    }, [capacities, prefixes]);

    const getNormalizedId = (fullId: string) => {
        return fullId.includes('-') ? fullId.split('-').slice(-2).join('-') : fullId;
    };

    const normalizedHighlight = useMemo(() => {
        if (!highlightedSpot) return null;
        const activeRecord = records.find(r => r.plate === highlightedSpot && r.status === 'ACTIVE');
        return getNormalizedId(activeRecord?.spotNumber || highlightedSpot);
    }, [highlightedSpot, records]);

    const getRecordForSpot = (spotId: string) => {
        const record = records.find(r => {
            const matchesSpot = getNormalizedId(r.spotNumber || '') === spotId;
            const matchesFloor = !floorId || (r.floorId || 'default') === floorId;
            return r.status === 'ACTIVE' && matchesSpot && matchesFloor;
        });
        if (showOnlyHighlighted && record) {
            return (normalizedHighlight === getNormalizedId(record.spotNumber || '')) ? record : null;
        }
        return record;
    };

    // Layout Constants
    const SPOT_WIDTH = 130;
    const SPOT_GAP = 20;
    const SIDE_PADDING = 150;

    const topSpotsCount = spots.filter(s => s.row === 'top').length;
    const botSpotsCount = spots.filter(s => s.row === 'bottom').length;
    const sideSpotsCount = spots.filter(s => s.row === 'side').length;

    const maxHorizontalSpots = Math.max(topSpotsCount, botSpotsCount);
    const canvasWidth = useMemo(() => {
        const spotsPart = maxHorizontalSpots * (SPOT_WIDTH + SPOT_GAP);
        const motoPart = sideSpotsCount > 0 ? 300 : 0; // Extra room for moto block
        return spotsPart + SIDE_PADDING * 2 + motoPart;
    }, [maxHorizontalSpots, sideSpotsCount]);

    // Pan Logic
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        const deltaX = e.clientX - dragStart.x;
        const minX = Math.min(0, containerRef.current.clientWidth - canvasWidth);
        setPosition({ x: Math.min(0, Math.max(deltaX, minX)), y: 0 });
    };

    const resetView = () => setPosition({ x: 0, y: 0 });

    const centerOnHighlight = () => {
        if (!normalizedHighlight || !containerRef.current) return;
        const targetSpot = spots.find(s => s.id === normalizedHighlight);
        if (!targetSpot) return;

        let index = -1;
        if (targetSpot.row === 'top') index = spots.filter(s => s.row === 'top').indexOf(targetSpot);
        else if (targetSpot.row === 'bottom') index = spots.filter(s => s.row === 'bottom').indexOf(targetSpot);

        if (index !== -1) {
            const spotX = SIDE_PADDING + index * (SPOT_WIDTH + SPOT_GAP) + SPOT_WIDTH / 2;
            const newX = (containerRef.current.clientWidth / 2) - spotX;
            const minX = Math.min(0, containerRef.current.clientWidth - canvasWidth);
            setPosition({ x: Math.min(0, Math.max(newX, minX)), y: 0 });
        }
    };

    useEffect(() => {
        if (normalizedHighlight) centerOnHighlight();
    }, [normalizedHighlight]);

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-[16/9] bg-[#020617] rounded-3xl overflow-hidden border border-white/5 select-none cursor-grab active:cursor-grabbing shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]"
            onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - position.x, y: 0 }); }}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
        >
            {/* 1. Blueprint Background Layer */}
            <div
                className={`absolute inset-0 h-full ${!isDragging ? 'transition-transform duration-700 cubic-bezier(0.2, 0, 0, 1)' : ''}`}
                style={{ width: `${canvasWidth}px`, transform: `translateX(${position.x}px)` }}
            >
                {/* Technical Grid */}
                <div className="absolute inset-0 bg-[#020617] opacity-60"
                    style={{
                        backgroundImage: `linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}>
                </div>

                {/* Main Driveway (Pasillo) */}
                <div className="absolute inset-x-0 h-[24%] top-1/2 -translate-y-1/2 bg-slate-900/40 border-y border-white/5 backdrop-blur-[2px]">
                    <div className="absolute inset-0 flex items-center justify-around opacity-5">
                        {Array.from({ length: Math.ceil(canvasWidth / 500) }).map((_, i) => (
                            <div key={i} className="flex flex-col items-center gap-16 -rotate-90">
                                <Move size={40} className="text-white" />
                            </div>
                        ))}
                    </div>
                    {/* Road Markings */}
                    <div className="absolute inset-x-0 top-1/2 h-px border-t border-dashed border-slate-700/50"></div>
                </div>

                {/* Spots Content Container */}
                <div className="absolute inset-0 px-[150px] py-12 flex flex-col justify-between">

                    {/* TOP ROW */}
                    <div className="flex gap-[20px] h-[35%]">
                        {spots.filter(s => s.row === 'top').map(spot => {
                            const record = getRecordForSpot(spot.id);
                            const isHigh = normalizedHighlight === spot.id;
                            const isSelected = selectedSpot === spot.id;

                            return (
                                <div
                                    key={spot.id}
                                    onClick={(e) => { e.stopPropagation(); if (!isDragging && interactive) setSelectedSpot(isSelected ? null : spot.id); }}
                                    className={`relative flex-none w-[130px] rounded-b-2xl border-x-2 border-b-2 transition-all duration-300
                                        ${isHigh ? 'border-indigo-500 bg-indigo-500/20 shadow-[0_0_25px_rgba(99,102,241,0.4)] z-20 scale-105' :
                                            isSelected ? 'border-amber-400 bg-amber-400/10 z-30 ring-2 ring-amber-400/50' :
                                                !!record ? 'border-slate-800 bg-slate-950/40' : 'border-slate-800 hover:border-slate-600 hover:bg-white/5'}
                                        flex flex-col items-center justify-end pb-5 group`}
                                >
                                    {/* Occupant */}
                                    {!!record ? (
                                        <div className="flex flex-col items-center gap-2 animate-in zoom-in duration-500">
                                            <div className={`p-2.5 rounded-xl border ${record.vehicleType === VehicleType.MOTORCYCLE ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'}`}>
                                                {record.vehicleType === VehicleType.MOTORCYCLE ? <Bike size={32} /> : <Car size={32} />}
                                            </div>
                                            {showPlates && (
                                                <div className="bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-[10px] font-black text-slate-300 tracking-tighter uppercase whitespace-nowrap">
                                                    {record.plate}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="opacity-[0.05] group-hover:opacity-[0.15] transition-opacity">
                                            {spot.type === 'PRIORITY' ? <Accessibility size={48} /> :
                                                spot.type === 'EV' ? <Zap size={48} /> : <Car size={48} />}
                                        </div>
                                    )}

                                    {/* Label */}
                                    <div className="absolute -bottom-10 flex flex-col items-center">
                                        <div className="bg-[#020617] border border-slate-800 px-3 py-1 rounded-md shadow-2xl">
                                            <span className={`text-[12px] font-black tracking-widest ${!!record ? 'text-indigo-400' : 'text-slate-600'}`}>{spot.id}</span>
                                        </div>
                                    </div>

                                    {/* High Marker */}
                                    {isHigh && (
                                        <div className="absolute -top-12 animate-bounce flex flex-col items-center">
                                            <div className="bg-indigo-500 text-white p-1 rounded-full shadow-lg">
                                                <Target size={20} />
                                            </div>
                                            <div className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-transparent"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* BOTTOM ROW */}
                    <div className="flex gap-[20px] h-[35%]">
                        {spots.filter(s => s.row === 'bottom').map(spot => {
                            const record = getRecordForSpot(spot.id);
                            const isHigh = normalizedHighlight === spot.id;
                            const isSelected = selectedSpot === spot.id;

                            return (
                                <div
                                    key={spot.id}
                                    onClick={(e) => { e.stopPropagation(); if (!isDragging && interactive) setSelectedSpot(isSelected ? null : spot.id); }}
                                    className={`relative flex-none w-[130px] rounded-t-2xl border-x-2 border-t-2 transition-all duration-300
                                        ${isHigh ? 'border-indigo-500 bg-indigo-500/20 shadow-[0_0_25px_rgba(99,102,241,0.4)] z-20 scale-105' :
                                            isSelected ? 'border-amber-400 bg-amber-400/10 z-30 ring-2 ring-amber-400/50' :
                                                !!record ? 'border-slate-800 bg-slate-950/40' : 'border-slate-800 hover:border-slate-600 hover:bg-white/5'}
                                        flex flex-col items-center justify-start pt-5 group`}
                                >
                                    {/* Label */}
                                    <div className="absolute -top-10 flex flex-col items-center">
                                        <div className="bg-[#020617] border border-slate-800 px-3 py-1 rounded-md shadow-2xl">
                                            <span className={`text-[12px] font-black tracking-widest ${!!record ? 'text-indigo-400' : 'text-slate-600'}`}>{spot.id}</span>
                                        </div>
                                    </div>

                                    {/* Occupant */}
                                    {!!record ? (
                                        <div className="flex flex-col items-center gap-2 animate-in slide-in-from-bottom duration-500">
                                            {showPlates && (
                                                <div className="bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-[10px] font-black text-slate-300 tracking-tighter uppercase whitespace-nowrap">
                                                    {record.plate}
                                                </div>
                                            )}
                                            <div className={`p-2.5 rounded-xl border ${record.vehicleType === VehicleType.MOTORCYCLE ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'}`}>
                                                {record.vehicleType === VehicleType.MOTORCYCLE ? <Bike size={32} /> : <Car size={32} />}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="opacity-[0.05] group-hover:opacity-[0.15] transition-opacity">
                                            {spot.type === 'EV' ? <Zap size={48} /> : <Car size={48} />}
                                        </div>
                                    )}

                                    {/* High Marker */}
                                    {isHigh && (
                                        <div className="absolute -bottom-12 animate-bounce flex flex-col items-center">
                                            <div className="w-1 h-4 bg-gradient-to-t from-indigo-500 to-transparent"></div>
                                            <div className="bg-indigo-500 text-white p-1 rounded-full shadow-lg">
                                                <Target size={20} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Moto Block (Dedicated Area to avoid overlap) */}
                {sideSpotsCount > 0 && (
                    <div className="absolute top-[35%] bottom-[35%] right-20 w-[240px] bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex flex-wrap gap-2 content-start overflow-y-auto custom-scrollbar">
                        <div className="w-full mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Zona Motos</span>
                            <Bike size={14} className="text-slate-600" />
                        </div>
                        {spots.filter(s => s.row === 'side').map(spot => {
                            const record = getRecordForSpot(spot.id);
                            return (
                                <div key={spot.id} className={`w-[45%] h-12 border border-slate-800 rounded-lg flex items-center justify-center relative ${!!record ? 'bg-amber-500/20 border-amber-500/40' : 'bg-black/20'}`}>
                                    <span className="absolute -top-1 -left-1 text-[8px] font-bold text-slate-700 bg-slate-950 px-1 border border-slate-800 rounded">{spot.id}</span>
                                    {!!record ? <Bike size={18} className="text-amber-500" /> : <Bike size={14} className="opacity-10" />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* UI Overlays - ONLY SHOW IF NOT IN PUBLIC VIEW */}
            {!showOnlyHighlighted && (
                <div className="absolute top-6 left-6 flex flex-col gap-3 pointer-events-none animate-in fade-in duration-500">
                    <div className="bg-slate-950/80 backdrop-blur-md border border-white/5 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-5">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center border border-indigo-500/30">
                            <LayoutDashboard size={20} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 leading-none">Map Analysis</h2>
                            <p className="text-xl font-black text-white leading-none uppercase tracking-tight">{floorName || 'Planta Principal'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Public View Header - Subtle indicator */}
            {showOnlyHighlighted && (
                <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none z-50">
                    <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 px-4 py-2 rounded-full flex items-center gap-2">
                        <MapPin size={14} className="text-emerald-400" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Ubicación Exacta</span>
                        <div className="h-4 w-px bg-emerald-500/20 mx-1"></div>
                        <span className="text-[10px] font-bold text-slate-400">{floorName}</span>
                    </div>
                </div>
            )}

            {/* Zoom/Reset Panel - Only if interactive or NOT in public view */}
            {!showOnlyHighlighted && (
                <div className="absolute bottom-8 left-8 flex items-center gap-3 animate-in slide-in-from-bottom duration-500">
                    <button
                        onClick={resetView}
                        className="w-12 h-12 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-xl text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 transition-all flex items-center justify-center shadow-2xl"
                    >
                        <Maximize size={22} />
                    </button>
                    {highlightedSpot && (
                        <button
                            onClick={centerOnHighlight}
                            className="w-12 h-12 bg-indigo-500/10 backdrop-blur-md border border-indigo-500/20 rounded-xl text-indigo-400 hover:bg-indigo-500/20 transition-all flex items-center justify-center shadow-2xl"
                        >
                            <Target size={22} />
                        </button>
                    )}
                </div>
            )}

            {/* Selection/Status Modal */}
            {selectedSpot && (
                <div className="absolute top-6 right-6 bottom-6 w-80 bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[100] animate-in slide-in-from-right p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 block">Space Id</span>
                            <h3 className="text-5xl font-black text-white tracking-widest leading-none">{selectedSpot}</h3>
                        </div>
                        <button onClick={() => setSelectedSpot(null)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 space-y-4">
                        {getRecordForSpot(selectedSpot) ? (
                            <>
                                <div className="bg-indigo-500/10 p-5 rounded-xl border border-indigo-500/20 space-y-3">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-500/20 rounded-lg border border-indigo-500/30 text-indigo-400">
                                            {getRecordForSpot(selectedSpot)?.vehicleType === VehicleType.MOTORCYCLE ? <Bike size={28} /> : <Car size={28} />}
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Vehicle License</p>
                                            <p className="text-2xl font-black text-white tracking-widest uppercase leading-none">{getRecordForSpot(selectedSpot)?.plate}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase mb-1 flex items-center gap-2"><Database size={10} /> Reference</p>
                                        <p className="text-sm font-semibold text-slate-200">{getRecordForSpot(selectedSpot)?.ownerId || 'Ocasional User'}</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase mb-1 flex items-center gap-2"><MapPin size={10} /> Time Entry</p>
                                        <p className="text-sm font-semibold text-slate-200">{new Date(getRecordForSpot(selectedSpot)?.entryTime || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                                <Maximize size={60} className="text-slate-800 mb-4" />
                                <p className="text-sm font-black text-slate-600 uppercase tracking-widest">Space Available</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Progress Bar - Only if not public view */}
            {!showOnlyHighlighted && (
                <div className="absolute bottom-6 right-8 w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-500/40 transition-all duration-300"
                        style={{
                            width: '30%',
                            transform: `translateX(${(Math.abs(position.x) / (canvasWidth - (containerRef.current?.clientWidth || 0))) * 100}%)`
                        }}
                    ></div>
                </div>
            )}
        </div>
    );
};
