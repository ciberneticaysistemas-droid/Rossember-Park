import React, { useState } from 'react';
import { DatabaseView } from '../components/DatabaseView';
import { RateSettingsModal } from '../components/RateSettingsModal';
import { ParkingMapModal } from '../components/ParkingMapModal';
import { AdManagementModal } from '../components/AdManagementModal';
import { PlateSearchModal } from '../components/PlateSearchModal';
import { GracePeriodModal } from '../components/GracePeriodModal';
import { ParkingRecord, VehicleType, Floor } from '../types';
import { LayoutDashboard, Activity, DollarSign, Database, Settings, MapPin, ArrowLeft, TrendingUp, Car, Bike, Image as ImageIcon, Clock, Palette } from 'lucide-react';
import { PersonalizationModal } from '../components/PersonalizationModal';

interface AdminViewProps {
    records: ParkingRecord[];
    rates: Record<string, number>;
    capacities: { REGULAR_CAR: number; PRIORITY_CAR: number; MOTO: number; EV_CHARGING: number };
    advertisements: string[];
    onRateUpdate: (newRates: Record<string, number>) => void;
    onCapacityUpdate?: (newCapacities: { REGULAR_CAR: number; PRIORITY_CAR: number; MOTO: number; EV_CHARGING: number }) => void;
    onAddAdvertisement: (url: string) => void;
    onRemoveAdvertisement: (index: number) => void;
    onManualExit: (id: string) => void;
    onInspection: (id: string) => Promise<void>;
    onBackToSelector: () => void;
    floors?: Floor[];
    onFloorsUpdate?: (floors: Floor[]) => void;
    clientLogo?: string | null;
    onUpdateClientLogo?: (logo: string | null) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
    records,
    rates,
    capacities,
    advertisements,
    onRateUpdate,
    onCapacityUpdate,
    onAddAdvertisement,
    onRemoveAdvertisement,
    onManualExit,
    onInspection,
    onBackToSelector,
    floors,
    onFloorsUpdate,
    clientLogo,
    onUpdateClientLogo
}) => {
    const [showDatabase, setShowDatabase] = useState(false);
    const [showRateSettings, setShowRateSettings] = useState(false);
    const [showParkingMap, setShowParkingMap] = useState(false);
    const [showAdManagement, setShowAdManagement] = useState(false);
    const [showPlateSearch, setShowPlateSearch] = useState(false);
    const [showGracePeriod, setShowGracePeriod] = useState(false);
    const [showPersonalization, setShowPersonalization] = useState(false);

    const activeRecords = records.filter(r => r.status === 'ACTIVE');
    const completedRecords = records.filter(r => r.status === 'COMPLETED');
    const totalRevenue = completedRecords.reduce((acc, curr) => acc + (curr.cost || 0), 0);
    const todayRevenue = completedRecords
        .filter(r => r.exitTime && new Date(r.exitTime).toDateString() === new Date().toDateString())
        .reduce((acc, curr) => acc + (curr.cost || 0), 0);

    const activeCars = activeRecords.filter(r => r.vehicleType === VehicleType.CAR).length;
    const activeMotos = activeRecords.filter(r => r.vehicleType === VehicleType.MOTORCYCLE).length;

    // Calculate total capacity from Floors if available, else use global capacities
    let currentTotalCapacity = 0;
    if (floors && floors.length > 0) {
        currentTotalCapacity = floors.reduce((acc, floor) => {
            return acc + Object.values(floor.capacities).reduce((a, b) => a + b, 0);
        }, 0);
    } else {
        currentTotalCapacity = capacities.REGULAR_CAR + capacities.PRIORITY_CAR + capacities.MOTO + capacities.EV_CHARGING;
    }

    const occupancyPercentage = currentTotalCapacity > 0 ? Math.round((activeRecords.length / currentTotalCapacity) * 100) : 0;

    // Chart Data Preparation (Last 7 Days)
    const getLast7DaysRevenue = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toDateString();
            const revenue = completedRecords
                .filter(r => r.exitTime && new Date(r.exitTime).toDateString() === dateStr)
                .reduce((acc, curr) => acc + (curr.cost || 0), 0);
            days.push({ day: d.toLocaleDateString('es-CO', { weekday: 'short' }), revenue });
        }
        return days;
    };

    const chartData = getLast7DaysRevenue();
    const maxRevenue = Math.max(...chartData.map(d => d.revenue), 100); // Avoid div by zero

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-xl border-b border-slate-600">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBackToSelector}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-600 p-3 rounded-xl shadow-lg shadow-purple-900/50">
                                    <LayoutDashboard className="w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold">Panel de Administrador</h1>
                                    <p className="text-slate-300 text-sm">Gestión y estadísticas del parqueadero</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

                {/* Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Occupancy */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl shadow-premium text-white relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all"></div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                <Activity size={24} />
                            </div>
                            <span className="text-3xl font-bold">{occupancyPercentage}%</span>
                        </div>
                        <h3 className="text-sm font-semibold opacity-90 mb-1 relative z-10">Ocupación Actual</h3>
                        <p className="text-2xl font-bold relative z-10">{activeRecords.length} / {currentTotalCapacity}</p>
                        <div className="mt-3 flex gap-3 text-xs relative z-10">
                            <span className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg">
                                <Car size={12} /> {activeCars}
                            </span>
                            <span className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg">
                                <Bike size={12} /> {activeMotos}
                            </span>
                        </div>
                    </div>

                    {/* Today Revenue */}
                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 rounded-2xl shadow-premium text-white relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all"></div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                <DollarSign size={24} />
                            </div>
                            <TrendingUp size={20} className="opacity-80" />
                        </div>
                        <h3 className="text-sm font-semibold opacity-90 mb-1 relative z-10">Ingresos Hoy</h3>
                        <p className="text-3xl font-bold relative z-10">${todayRevenue.toLocaleString()}</p>
                    </div>

                    {/* Total Revenue */}
                    <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-6 rounded-2xl shadow-premium text-white relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all"></div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                <DollarSign size={24} />
                            </div>
                        </div>
                        <h3 className="text-sm font-semibold opacity-90 mb-1 relative z-10">Ingresos Totales</h3>
                        <p className="text-3xl font-bold relative z-10">${totalRevenue.toLocaleString()}</p>
                        <p className="text-xs opacity-80 mt-2 relative z-10 bg-black/20 inline-block px-2 py-1 rounded-lg">{completedRecords.length} transacciones</p>
                    </div>

                    {/* Total Vehicles */}
                    <div className="bg-gradient-to-br from-orange-600 to-orange-700 p-6 rounded-2xl shadow-premium text-white relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all"></div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                <Car size={24} />
                            </div>
                        </div>
                        <h3 className="text-sm font-semibold opacity-90 mb-1 relative z-10">Total Vehículos</h3>
                        <p className="text-3xl font-bold relative z-10">{records.length}</p>
                        <p className="text-xs opacity-80 mt-2 relative z-10 bg-black/20 inline-block px-2 py-1 rounded-lg">{activeRecords.length} activos</p>
                    </div>
                </div>

                {/* Charts Area */}
                <div className="mb-8 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-400" />
                        Ingresos Últimos 7 Días
                    </h3>
                    <div className="h-48 flex items-end gap-3 md:gap-6 justify-between px-2">
                        {chartData.map((d, i) => (
                            <div key={i} className="flex flex-col items-center justify-end flex-1 h-full group">
                                <div className="w-full bg-slate-700 rounded-t-lg relative transition-all duration-500 hover:bg-emerald-600 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                    style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: '4px' }}>
                                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-600 pointer-events-none z-20">
                                        ${d.revenue.toLocaleString()}
                                    </div>
                                </div>
                                <span className="text-slate-400 text-xs mt-3 font-medium uppercase">{d.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Cards Grid - Reorganized */}
                <h2 className="text-2xl font-bold text-white mb-6 pl-1">Gestión del Parqueadero</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

                    {/* 1. Base de Datos & Buscador */}
                    <button
                        onClick={() => setShowDatabase(true)}
                        className="bg-slate-800 hover:bg-slate-750 p-6 rounded-2xl shadow-premium border border-slate-700 transition-all text-left group hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/20"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-blue-600 p-3 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-blue-900/30">
                                <Database size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">Base de Datos</h3>
                                <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-800/50 mt-1 inline-block">Incluye Buscador</span>
                            </div>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">Ver todos los registros, buscar placas, reimprimir recibos y gestionar salidas manuales.</p>
                    </button>

                    {/* 2. Mapa & Capacidad */}
                    <button
                        onClick={() => setShowParkingMap(true)}
                        className="bg-slate-800 hover:bg-slate-750 p-6 rounded-2xl shadow-premium border border-slate-700 transition-all text-left group hover:border-purple-500 hover:shadow-lg hover:shadow-purple-900/20"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-purple-600 p-3 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-purple-900/30">
                                <MapPin size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">Mapa de Parqueo</h3>
                                <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded border border-purple-800/50 mt-1 inline-block">Editar Cupos</span>
                            </div>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">Visualizar ocupación en tiempo real y editar la cantidad de cupos disponibles por zona.</p>
                    </button>

                    {/* 3. Tarifas */}
                    <button
                        onClick={() => setShowRateSettings(true)}
                        className="bg-slate-800 hover:bg-slate-750 p-6 rounded-2xl shadow-premium border border-slate-700 transition-all text-left group hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-900/20"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-emerald-600 p-3 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-emerald-900/30">
                                <Settings size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">Tarifas</h3>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">Configurar precios por minuto, tarifas plenas, descuentos y cobros especiales.</p>
                    </button>

                    {/* 4. Tiempo de Gracia */}
                    <button
                        onClick={() => setShowGracePeriod(true)}
                        className="bg-slate-800 hover:bg-slate-750 p-6 rounded-2xl shadow-premium border border-slate-700 transition-all text-left group hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-900/20"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-indigo-600 p-3 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-indigo-900/30">
                                <Clock size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">Tiempo de Gracia</h3>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">Configurar el tiempo permitido para salir después de realizar el pago.</p>
                    </button>

                    {/* 5. Publicidad */}
                    <button
                        onClick={() => setShowAdManagement(true)}
                        className="bg-slate-800 hover:bg-slate-750 p-6 rounded-2xl shadow-premium border border-slate-700 transition-all text-left group hover:border-pink-500 hover:shadow-lg hover:shadow-pink-900/20"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-pink-600 p-3 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-pink-900/30">
                                <ImageIcon size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white group-hover:text-pink-400 transition-colors">Publicidad</h3>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">Gestionar imágenes y videos rotativos que se muestran en el kiosco.</p>
                    </button>

                    {/* 6. Personalización */}
                    <button
                        onClick={() => setShowPersonalization(true)}
                        className="bg-slate-800 hover:bg-slate-750 p-6 rounded-2xl shadow-premium border border-slate-700 transition-all text-left group hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-900/20"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-cyan-600 p-3 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-cyan-900/30">
                                <Palette size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">Personalización</h3>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">Configurar el logo de la empresa y opciones de marca blanca.</p>
                    </button>

                </div>

                {/* Recent Activity Mini Table */}
                <div className="bg-slate-800 rounded-2xl shadow-premium border border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Actividad Reciente</h2>
                            <p className="text-slate-400 text-sm">Últimas transacciones completadas</p>
                        </div>
                        <button onClick={() => setShowDatabase(true)} className="text-blue-400 hover:text-blue-300 text-sm font-bold hover:underline">
                            Ver Todo
                        </button>
                    </div>
                    <div className="p-0">
                        {completedRecords.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Database size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">Sin transacciones completadas</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-700">
                                {completedRecords.slice(0, 5).map(record => (
                                    <div key={record.id} className="p-4 hover:bg-slate-750 transition-colors flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${record.vehicleType === VehicleType.CAR ? 'bg-blue-900/50 text-blue-400' : 'bg-orange-900/50 text-orange-400'}`}>
                                                {record.vehicleType === VehicleType.CAR ? <Car size={18} /> : <Bike size={18} />}
                                            </div>
                                            <div>
                                                <span className="font-bold text-white block">{record.plate}</span>
                                                <span className="text-xs text-slate-500">{new Date(record.exitTime || Date.now()).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-emerald-400 block">+ ${record.cost?.toLocaleString()}</span>
                                            <span className="text-xs text-slate-500">
                                                {record.exitTime ? (() => {
                                                    const diff = record.exitTime - record.entryTime;
                                                    const minutes = Math.floor(diff / 60000);
                                                    const hours = Math.floor(minutes / 60);
                                                    const mins = minutes % 60;
                                                    return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
                                                })() : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showDatabase && (
                <DatabaseView
                    records={records}
                    onClose={() => setShowDatabase(false)}
                    onOpenSettings={() => setShowRateSettings(true)}
                    onManualExit={onManualExit}
                    onOpenSearch={() => {
                        setShowDatabase(false);
                        setShowPlateSearch(true);
                    }}
                />
            )}

            {showRateSettings && (
                <RateSettingsModal
                    currentRates={rates}
                    onSave={(newRates) => {
                        onRateUpdate(newRates);
                        setShowRateSettings(false);
                    }}
                    onCancel={() => setShowRateSettings(false)}
                />
            )}

            {showParkingMap && (
                <ParkingMapModal
                    records={records}
                    capacities={capacities}
                    onClose={() => setShowParkingMap(false)}
                    onCapacityChange={onCapacityUpdate}
                    onFloorsUpdate={onFloorsUpdate}
                    floors={floors}
                    allowEdit={true}
                    onManualExit={onManualExit}
                />
            )}

            {showAdManagement && (
                <AdManagementModal
                    advertisements={advertisements}
                    onAdd={onAddAdvertisement}
                    onRemove={onRemoveAdvertisement}
                    onClose={() => setShowAdManagement(false)}
                />
            )}

            {showPlateSearch && (
                <PlateSearchModal
                    records={records}
                    onClose={() => setShowPlateSearch(false)}
                />
            )}

            {showGracePeriod && (
                <GracePeriodModal
                    currentGracePeriod={rates['GRACE_PERIOD_MINUTES'] || 15}
                    onSave={(minutes) => {
                        onRateUpdate({ ...rates, 'GRACE_PERIOD_MINUTES': minutes });
                        setShowGracePeriod(false);
                    }}
                    onClose={() => setShowGracePeriod(false)}
                />
            )}

            {showPersonalization && onUpdateClientLogo && (
                <PersonalizationModal
                    currentLogo={clientLogo || null}
                    onSave={(logo) => {
                        onUpdateClientLogo(logo);
                        setShowPersonalization(false);
                    }}
                    onClose={() => setShowPersonalization(false)}
                />
            )}
        </div>
    );
};
