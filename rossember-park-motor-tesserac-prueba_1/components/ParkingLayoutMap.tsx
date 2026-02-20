import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Car, Bike, Accessibility, Zap, ArrowRight, ArrowLeft, X, Info, ZoomIn, ZoomOut, Move, Maximize, Target } from 'lucide-react';
import { ParkingRecord, VehicleType } from '../types';

interface ParkingLayoutMapProps {
    highlightedSpot?: string;
    isEntryAssignment?: boolean;
    records?: ParkingRecord[];
    interactive?: boolean;
    showOnlyHighlighted?: boolean;
    mapImageUrl?: string;
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
 * A highly dynamic and visible parking lot map.
 * Generates spots based on configuration and allows full navigation.
 */
export const ParkingLayoutMap: React.FC<ParkingLayoutMapProps> = ({
    highlightedSpot,
    isEntryAssignment,
    records = [],
    interactive = false,
    showOnlyHighlighted = false,
    mapImageUrl,
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
    const mapRef = useRef<HTMLDivElement>(null);

    // Define zones and their grid logical positions based on floor
    const spots = useMemo(() => {
        // If capacities are explicitly passed, generate spots dynamically
        if (capacities && prefixes) {
            const allSpots: any[] = [];

            // Priority
            for (let i = 1; i <= capacities.PRIORITY_CAR; i++) {
                allSpots.push({ id: `${prefixes.PRIORITY_CAR}-${i.toString().padStart(3, '0')}`, type: 'PRIORITY' });
            }
            // EV
            for (let i = 1; i <= capacities.EV_CHARGING; i++) {
                allSpots.push({ id: `${prefixes.EV_CHARGING}-${i.toString().padStart(3, '0')}`, type: 'EV' });
            }
            // Regular
            for (let i = 1; i <= Math.ceil(capacities.REGULAR_CAR / 2); i++) {
                allSpots.push({ id: `${prefixes.REGULAR_CAR}-${i.toString().padStart(3, '0')}`, type: 'REGULAR', side: 'top' });
            }
            const secondHalfStart = Math.ceil(capacities.REGULAR_CAR / 2) + 1;
            for (let i = secondHalfStart; i <= capacities.REGULAR_CAR; i++) {
                allSpots.push({ id: `${prefixes.REGULAR_CAR}-${i.toString().padStart(3, '0')}`, type: 'REGULAR', side: 'bottom' });
            }
            // Moto
            for (let i = 1; i <= capacities.MOTO; i++) {
                allSpots.push({ id: `${prefixes.MOTO}-${i.toString().padStart(3, '0')}`, type: 'MOTO' });
            }

            const result: any[] = [];

            // Distribute to rows
            allSpots.filter(s => s.type === 'PRIORITY' || (s.type === 'REGULAR' && s.side === 'top')).forEach(s => result.push({ ...s, rotation: 'top' }));
            allSpots.filter(s => s.type === 'EV' || (s.type === 'REGULAR' && s.side === 'bottom')).forEach(s => result.push({ ...s, rotation: 'bottom' }));

            const moto = allSpots.filter(s => s.type === 'MOTO');
            const motoHalf = Math.ceil(moto.length / 2);
            moto.slice(0, motoHalf).forEach(s => result.push({ ...s, rotation: 'left' }));
            moto.slice(motoHalf).forEach(s => result.push({ ...s, rotation: 'right' }));

            return result;
        }

        const isFloor1 = !floorId || floorId === 'default' || floorId === 'floor-1';
        if (isFloor1) {
            return [
                ...Array.from({ length: 5 }, (_, i) => ({ id: `P-00${i + 1}`, type: 'PRIORITY', rotation: 'top' })),
                ...Array.from({ length: 15 }, (_, i) => ({ id: `C-01${i + 1}`, type: 'REGULAR', rotation: 'top' })),
                ...Array.from({ length: 5 }, (_, i) => ({ id: `E-00${i + 1}`, type: 'EV', rotation: 'bottom' })),
                ...Array.from({ length: 15 }, (_, i) => ({ id: `C-00${i + 1}`, type: 'REGULAR', rotation: 'bottom' })),
                ...Array.from({ length: 8 }, (_, i) => ({ id: `M-00${i + 1}`, type: 'MOTO', rotation: 'left' })),
                ...Array.from({ length: 7 }, (_, i) => ({ id: `M-00${i + 9}`, type: 'MOTO', rotation: 'right' })),
            ];
        } else {
            return [
                ...Array.from({ length: 10 }, (_, i) => ({ id: `C-00${i + 1}`, type: 'REGULAR', rotation: 'top' })),
                ...Array.from({ length: 5 }, (_, i) => ({ id: `P-00${i + 1}`, type: 'PRIORITY', rotation: 'top' })),
                ...Array.from({ length: 5 }, (_, i) => ({ id: `M-01${i + 1}`, type: 'MOTO', rotation: 'left' })),
                ...Array.from({ length: 5 }, (_, i) => ({ id: `E-00${i + 1}`, type: 'EV', rotation: 'bottom' })),
            ];
        }
    }, [floorId, capacities, prefixes]);

    const getNormalizedId = (fullId: string) => {
        const parts = fullId.split('-');
        return parts.slice(-2).join('-');
    };

    const normalizedHighlight = useMemo(() => {
        if (!highlightedSpot) return null;
        const recordByPlate = records.find(r => r.plate === highlightedSpot && r.status === 'ACTIVE');
        if (recordByPlate && recordByPlate.spotNumber) {
            return getNormalizedId(recordByPlate.spotNumber);
        }
        return getNormalizedId(highlightedSpot);
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

    const handleSpotClick = (e: React.MouseEvent, spotId: string) => {
        e.stopPropagation();
        if (isDragging) return;
        if (!interactive) return;
        setSelectedSpot(selectedSpot === spotId ? null : spotId);
    };

    // Calculate dynamic canvas size based on number of spots
    const spotsPerRow = Math.ceil(spots.length / 2);
    const minWidthPerSpot = 130; // Slightly more for better breathing room
    const canvasWidth = useMemo(() => {
        const calculated = spotsPerRow * minWidthPerSpot + 400;
        return calculated;
    }, [spotsPerRow]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const container = containerRef.current;
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // Horizontal constraints
        const availableWidth = container.clientWidth;
        const totalWidth = canvasWidth;

        let minX, maxX;
        if (totalWidth <= availableWidth) {
            // Center if smaller
            minX = (availableWidth - totalWidth) / 2;
            maxX = minX;
        } else {
            minX = availableWidth - totalWidth;
            maxX = 0;
        }

        // Vertical constraints - Fixed height for now
        const minY = 0;
        const maxY = 0;

        setPosition({
            x: Math.min(maxX, Math.max(newX, minX)),
            y: Math.min(maxY, Math.max(newY, minY))
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleWheel = (e: React.WheelEvent) => {
        // Zoom disabled as per user request ("ni zoom ni alejarse")
        // But we allow vertical scroll if needed, though panning is preferred
    };

    // Keep position valid when container or canvasWidth changes
    useEffect(() => {
        const updatePosition = () => {
            if (!containerRef.current) return;
            const container = containerRef.current;

            setPosition(prev => {
                const availableWidth = container.clientWidth;
                const totalWidth = canvasWidth;

                let minX, maxX;
                if (totalWidth <= availableWidth) {
                    minX = (availableWidth - totalWidth) / 2;
                    maxX = minX;
                } else {
                    minX = availableWidth - totalWidth;
                    maxX = 0;
                }

                return {
                    x: Math.min(maxX, Math.max(prev.x, minX)),
                    y: 0
                };
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [canvasWidth]);

    const resetView = () => {
        setPosition({ x: 0, y: 0 });
    };

    const centerOnHighlight = () => {
        if (!normalizedHighlight || !containerRef.current) return;

        // Find index of the highlighted spot in its row
        const spotsTop = spots.filter(s => s.rotation === 'top');
        const spotsBottom = spots.filter(s => s.rotation === 'bottom');

        let index = spotsTop.findIndex(s => s.id === normalizedHighlight);
        if (index === -1) {
            index = spotsBottom.findIndex(s => s.id === normalizedHighlight);
        }

        if (index !== -1) {
            const container = containerRef.current;
            const spotWidth = 120;
            const spotGap = 24; // gap-6
            const padding = 128; // px-32

            // Calculate X coordinate of spot center relative to canvas start
            const spotX = padding + index * (spotWidth + spotGap) + spotWidth / 2;

            // New position to center this X in the container
            const newX = container.clientWidth / 2 - spotX;

            // Clamp newX
            const availableWidth = container.clientWidth;
            const totalWidth = canvasWidth;
            const minX = Math.min(0, availableWidth - totalWidth);
            const maxX = 0;

            setPosition({ x: Math.min(maxX, Math.max(newX, minX)), y: 0 });
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-[16/9] bg-[#0F172A] rounded-3xl overflow-hidden shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] border-4 border-slate-800 select-none cursor-grab active:cursor-grabbing group/map"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            {/* Navigable Canvas */}
            <div
                ref={mapRef}
                className={`absolute inset-0 ${!isDragging ? 'transition-all duration-500 ease-out' : 'transition-none'}`}
                style={{
                    width: `${canvasWidth}px`,
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    transformOrigin: '0 0'
                }}
            >
                {/* Architectural Background */}
                <div className="absolute inset-0 bg-[#1e293b]">
                    <div className="absolute inset-0 opacity-[0.1]"
                        style={{
                            backgroundImage: 'linear-gradient(#fff 2px, transparent 2px), linear-gradient(90deg, #fff 2px, transparent 2px)',
                            backgroundSize: '80px 80px'
                        }}>
                    </div>

                    {/* Ground Texture/Grid */}
                    <div className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
                            backgroundSize: '20px 20px'
                        }}>
                    </div>

                    {/* Central Roadway with Glow */}
                    <div className="absolute inset-0 flex flex-col justify-center pointer-events-none">
                        <div className="w-full h-48 bg-slate-900/40 backdrop-blur-sm relative overflow-hidden">
                            {/* Road Glow */}
                            <div className="absolute inset-0 bg-blue-500/5 blur-3xl"></div>

                            {/* Lines */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>

                            {/* Center Dash */}
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full h-1 border-t-2 border-dashed border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]"></div>
                            </div>

                            {/* Road Text/Markings */}
                            <div className="absolute inset-0 flex items-center justify-around opacity-10">
                                {Array.from({ length: Math.ceil(canvasWidth / 500) }).map((_, i) => (
                                    <div key={i} className="flex flex-col items-center gap-20 -rotate-90">
                                        <ArrowRight size={40} className="text-white" />
                                        <ArrowLeft size={40} className="text-white" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Landscaping Borders (EXTENDED TO COVER FULL WIDTH) */}
                <div className="absolute top-0 left-[-2000px] right-[-2000px] h-20 bg-gradient-to-b from-[#365314] to-[#4D7C0F] border-b-4 border-black/30 z-40"></div>
                <div className="absolute bottom-0 left-[-2000px] right-[-2000px] h-20 bg-gradient-to-t from-[#365314] to-[#4D7C0F] border-t-4 border-black/30 z-40"></div>

                {/* Parking Spots Grid */}
                <div className="absolute inset-0 px-40 py-24 flex flex-col justify-between z-30">

                    {/* TOP ROW */}
                    <div className="flex gap-6 h-[33%]">
                        {spots.filter(s => s.rotation === 'top').map(spot => {
                            const record = getRecordForSpot(spot.id);
                            const isSelected = selectedSpot === spot.id;
                            const isHighlight = normalizedHighlight === spot.id;

                            return (
                                <div
                                    key={spot.id}
                                    onClick={(e) => handleSpotClick(e, spot.id)}
                                    className={`flex-none w-[120px] border-x-4 border-b-4 rounded-b-2xl transition-all cursor-pointer relative flex flex-col items-center justify-center gap-3 group
                                        ${isHighlight ? 'bg-emerald-500/40 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.5)] z-20' :
                                            !!record ? 'bg-rose-600/30 border-rose-500 shadow-inner' :
                                                'bg-white/5 border-slate-600 hover:bg-white/10'}
                                        ${isSelected ? 'scale-110 !border-blue-400 !bg-blue-600/20 z-30 shadow-[0_0_40px_rgba(59,130,246,0.6)]' : ''}`}
                                >
                                    {!!record ? (
                                        <div className="flex flex-col items-center animate-fade-in scale-110">
                                            <div className={`p-3 rounded-2xl shadow-lg border-2 ${record.vehicleType === VehicleType.MOTORCYCLE ? 'bg-orange-600 border-orange-400' : 'bg-blue-600 border-blue-400'}`}>
                                                {record.vehicleType === VehicleType.MOTORCYCLE ? <Bike size={40} className="text-white" /> : <Car size={40} className="text-white" />}
                                            </div>
                                            {showPlates && (
                                                <div className="mt-2 bg-yellow-400 text-black px-2 py-0.5 rounded font-black text-[10px] shadow-md border border-black/20">
                                                    {record.plate}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center opacity-40 group-hover:opacity-80 transition-opacity scale-110">
                                            {spot.type === 'PRIORITY' ? <Accessibility size={50} className="text-blue-400" /> :
                                                spot.type === 'EV' ? <Zap size={50} className="text-emerald-400" /> :
                                                    spot.type === 'MOTO' ? <Bike size={50} className="text-orange-400" /> :
                                                        <Car size={50} className="text-slate-400" />}
                                        </div>
                                    )}

                                    <div className="absolute -bottom-12 flex flex-col items-center z-10">
                                        <div className="bg-slate-900 px-4 py-1.5 rounded-full border border-white/20 shadow-2xl">
                                            <span className={`text-[16px] font-black tracking-tighter ${!!record ? 'text-rose-400' : 'text-slate-300'}`}>
                                                {spot.id}
                                            </span>
                                        </div>
                                    </div>

                                    {isHighlight && (
                                        <div className="absolute -top-16 animate-bounce">
                                            <Target size={44} className="text-emerald-400 drop-shadow-[0_0_15px_#34d399]" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Moto Side Lanes - MOVED INSIDE V-BOUNDARIES */}
                    <div className="absolute inset-y-24 left-8 w-24 flex flex-col justify-center gap-4 px-4 pointer-events-none z-50">
                        {spots.filter(s => s.rotation === 'left').map(spot => {
                            const record = getRecordForSpot(spot.id);
                            return (
                                <div key={spot.id} onClick={(e) => handleSpotClick(e, spot.id)} className={`w-16 h-[80px] border-y-4 border-r-4 rounded-r-xl pointer-events-auto transition-all flex items-center justify-center relative shadow-lg ${!!record ? 'bg-rose-600/30 border-rose-500' : 'bg-white/5 border-slate-700'}`}>
                                    <span className="absolute -left-2 text-[10px] font-black text-slate-400 -rotate-90 whitespace-nowrap">{spot.id}</span>
                                    {!!record ? <Bike size={24} className="text-orange-400 rotate-90" /> : <Bike size={20} className="opacity-20 rotate-90" />}
                                </div>
                            );
                        })}
                    </div>
                    <div className="absolute inset-y-24 right-8 w-24 flex flex-col justify-center gap-4 px-4 pointer-events-none z-50">
                        {spots.filter(s => s.rotation === 'right').map(spot => {
                            const record = getRecordForSpot(spot.id);
                            return (
                                <div key={spot.id} onClick={(e) => handleSpotClick(e, spot.id)} className={`w-16 h-[80px] border-y-4 border-l-4 rounded-l-xl pointer-events-auto transition-all flex items-center justify-center relative shadow-lg ${!!record ? 'bg-rose-600/30 border-rose-500' : 'bg-white/5 border-slate-700'}`}>
                                    <span className="absolute -right-2 text-[10px] font-black text-slate-400 rotate-90 whitespace-nowrap">{spot.id}</span>
                                    {!!record ? <Bike size={24} className="text-orange-400 -rotate-90" /> : <Bike size={20} className="opacity-20 -rotate-90" />}
                                </div>
                            );
                        })}
                    </div>

                    {/* BOTTOM ROW */}
                    <div className="flex gap-6 h-[33%]">
                        {spots.filter(s => s.rotation === 'bottom').map(spot => {
                            const record = getRecordForSpot(spot.id);
                            const isSelected = selectedSpot === spot.id;
                            const isHighlight = normalizedHighlight === spot.id;

                            return (
                                <div
                                    key={spot.id}
                                    onClick={(e) => handleSpotClick(e, spot.id)}
                                    className={`flex-none w-[120px] border-x-4 border-t-4 rounded-t-2xl transition-all cursor-pointer relative flex flex-col items-center justify-center gap-3 group
                                        ${isHighlight ? 'bg-emerald-500/40 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.5)] z-20' :
                                            !!record ? 'bg-rose-600/30 border-rose-500 shadow-inner' :
                                                'bg-white/5 border-slate-600 hover:bg-white/10'}
                                        ${isSelected ? 'scale-110 !border-blue-400 !bg-blue-600/20 z-30 shadow-[0_0_40px_rgba(59,130,246,0.6)]' : ''}`}
                                >
                                    <div className="absolute -top-12 flex flex-col items-center z-10">
                                        <div className="bg-slate-900 px-4 py-1.5 rounded-full border border-white/20 shadow-2xl">
                                            <span className={`text-[16px] font-black tracking-tighter ${!!record ? 'text-rose-400' : 'text-slate-300'}`}>
                                                {spot.id}
                                            </span>
                                        </div>
                                    </div>

                                    {!!record ? (
                                        <div className="flex flex-col items-center animate-fade-in scale-110">
                                            <div className={`p-3 rounded-2xl shadow-lg border-2 ${record.vehicleType === VehicleType.MOTORCYCLE ? 'bg-orange-600 border-orange-400' : 'bg-blue-600 border-blue-400'}`}>
                                                {record.vehicleType === VehicleType.MOTORCYCLE ? <Bike size={40} className="text-white" /> : <Car size={40} className="text-white" />}
                                            </div>
                                            {showPlates && (
                                                <div className="mt-2 bg-yellow-400 text-black px-2 py-0.5 rounded font-black text-[10px] shadow-md border border-black/20">
                                                    {record.plate}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center opacity-40 group-hover:opacity-80 transition-opacity scale-110">
                                            {spot.type === 'PRIORITY' ? <Accessibility size={50} className="text-blue-400" /> :
                                                spot.type === 'EV' ? <Zap size={50} className="text-emerald-400" /> :
                                                    spot.type === 'MOTO' ? <Bike size={50} className="text-orange-400" /> :
                                                        <Car size={50} className="text-slate-400" />}
                                        </div>
                                    )}

                                    {isHighlight && (
                                        <div className="absolute -bottom-16 animate-bounce">
                                            <Target size={44} className="text-emerald-400 drop-shadow-[0_0_15px_#34d399]" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Overlays - COMPACTED TO AVOID SIDE PANEL */}
            <div className="absolute top-6 left-6 z-[60] flex flex-col gap-2 pointer-events-none">
                <div className="bg-slate-950/80 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Mapa Interactivo</p>
                        <p className="text-lg font-black text-white leading-none uppercase tracking-tight">{floorName || (floorId === 'floor-2' ? 'Nivel 2' : 'Nivel 1')}</p>
                    </div>
                </div>
                <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-xl text-[10px] text-white/60 font-medium border border-white/5 flex items-center gap-2">
                    <Move size={14} className="text-blue-400/60" /> Arrastra para navegar
                </div>
            </div>

            {/* Controls - ONLY Global View Reset */}
            <div className="absolute bottom-8 left-8 z-[60] flex gap-3">
                <div className="flex bg-slate-900/90 backdrop-blur-xl rounded-2xl border-2 border-white/10 p-2 shadow-2xl">
                    <button onClick={resetView} className="p-3 hover:bg-blue-500/20 rounded-xl text-white transition-all active:scale-90" title="Reiniciar Vista">
                        <Maximize size={24} />
                    </button>
                    {highlightedSpot && (
                        <button onClick={centerOnHighlight} className="p-3 hover:bg-emerald-500/20 rounded-xl text-emerald-400 transition-all active:scale-90" title="Ver Marcado">
                            <Target size={24} />
                        </button>
                    )}
                </div>
            </div>

            {/* Selection Info - REFINED & COMPACT */}
            {selectedSpot && interactive && (
                <div className="absolute top-6 right-6 bottom-6 w-[340px] bg-slate-950/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl z-[100] animate-fade-in-right overflow-hidden flex flex-col">
                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 block">Detalle del Puesto</span>
                                <h4 className="text-5xl font-black text-white tracking-widest leading-none">{selectedSpot}</h4>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedSpot(null); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        {getRecordForSpot(selectedSpot) ? (
                            <div className="space-y-6">
                                <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20 shadow-inner">
                                    <span className="text-[9px] text-blue-400 uppercase font-black tracking-widest mb-3 block">Placa Identificada</span>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${getRecordForSpot(selectedSpot)?.vehicleType === VehicleType.MOTORCYCLE ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                            {getRecordForSpot(selectedSpot)?.vehicleType === VehicleType.MOTORCYCLE ? <Bike size={32} className="text-white" /> : <Car size={32} className="text-white" />}
                                        </div>
                                        <span className="text-4xl font-black text-white tracking-widest uppercase">
                                            {getRecordForSpot(selectedSpot)?.plate}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <p className="text-[9px] text-white/40 uppercase font-black mb-1">Propietario</p>
                                        <p className="text-lg font-bold text-white uppercase truncate">{getRecordForSpot(selectedSpot)?.ownerId || 'Ocasional'}</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <p className="text-[9px] text-white/40 uppercase font-black mb-1">Hora de Ingreso</p>
                                        <p className="text-lg font-bold text-white tracking-tight">{new Date(getRecordForSpot(selectedSpot)?.entryTime || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-center bg-emerald-500/5 rounded-3xl border-2 border-dashed border-emerald-500/20 px-4">
                                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                                    <Zap size={32} className="text-emerald-400" />
                                </div>
                                <p className="text-2xl font-black text-emerald-400 mb-1 uppercase tracking-tight">Disponible</p>
                                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest leading-tight">Sin vehículo en este momento</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Global Scroll Progress Bar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-1 bg-white/10 rounded-full overflow-hidden z-[60]">
                <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{
                        width: `${Math.max(5, (containerRef.current?.clientWidth || 0) / canvasWidth * 100)}%`,
                        transform: `translateX(${(-position.x / (canvasWidth - (containerRef.current?.clientWidth || 0))) * 100}%)`
                    }}
                ></div>
            </div>
        </div>
    );
};
