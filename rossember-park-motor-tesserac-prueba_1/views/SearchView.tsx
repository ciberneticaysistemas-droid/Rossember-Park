import React, { useState } from 'react';
import { ParkingMapModal } from '../components/ParkingMapModal';
import { PaymentModal } from '../components/PaymentModal';
import { Toast } from '../components/Toast';
import { ParkingRecord, VehicleType, Floor, SpecialRate, SpecialRateType } from '../types';
import { useVoice } from '../hooks/useVoice';
import { generateInvoice } from '../services/pdfService';
import { Search, MapPin, Car, Bike, Clock, DollarSign, ArrowLeft, AlertCircle, CreditCard, CheckCircle, Download, Info } from 'lucide-react';

interface SearchViewProps {
    records: ParkingRecord[];
    capacities: { REGULAR_CAR: number; PRIORITY_CAR: number; MOTO: number; EV_CHARGING: number };
    rates: Record<string, number>;
    onProcessPayment: (recordId: string, paymentMethod: string, email: string) => void;
    calculateCost: (entryTime: number, type: VehicleType, isDisabled?: boolean, requiresCharging?: boolean, plate?: string) => { cost: number; originalCost?: number; minutes: number; exitTime: number; specialRateLabel?: string; specialRate?: SpecialRate };
    onBackToSelector: () => void;
    floors?: Floor[];
    clientLogo?: string | null;
}

export const SearchView: React.FC<SearchViewProps> = ({ records, capacities, rates, onProcessPayment, calculateCost, onBackToSelector, floors, clientLogo }) => {
    const { speak } = useVoice();
    const [searchPlate, setSearchPlate] = useState('');
    const [searchResult, setSearchResult] = useState<ParkingRecord | null>(null);
    const [showMap, setShowMap] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [pendingPayment, setPendingPayment] = useState<{
        recordId: string;
        plate: string;
        cost: number;
        originalCost?: number;
        minutes: number;
        vehicleType: VehicleType;
        isDisabled?: boolean;
        durationStr: string;
        specialRateLabel?: string;
        specialRate?: SpecialRate;
    } | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const activeRecords = records.filter(r => r.status === 'ACTIVE');

    const handleSearch = () => {
        setErrorMsg(null);
        setSearchResult(null);
        setPaymentSuccess(false);

        if (!searchPlate.trim()) {
            setErrorMsg("Por favor ingresa una placa para buscar");
            return;
        }

        const found = activeRecords.find(r => r.plate.toUpperCase() === searchPlate.toUpperCase());

        if (found) {
            setSearchResult(found);
        } else {
            setErrorMsg(`No se encontró el vehículo con placa ${searchPlate.toUpperCase()} en el parqueadero`);
        }
    };

    const handleInitiatePayment = () => {
        if (!searchResult) return;
        speak("Zona de pagos");

        const { cost, originalCost, minutes, specialRateLabel, specialRate } = calculateCost(searchResult.entryTime, searchResult.vehicleType, searchResult.isDisabled, searchResult.requiresCharging, searchResult.plate);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

        setPendingPayment({
            recordId: searchResult.id,
            plate: searchResult.plate,
            cost,
            originalCost,
            minutes,
            vehicleType: searchResult.vehicleType,
            isDisabled: searchResult.isDisabled,
            durationStr,
            specialRateLabel,
            specialRate
        });
    };

    const handlePaymentConfirm = (bank: string, email: string) => {
        if (!pendingPayment || !searchResult) return;

        const method = `PSE - ${bank}`;
        onProcessPayment(pendingPayment.recordId, method, email);

        // Generate Invoice immediately
        generateInvoice({
            id: pendingPayment.recordId,
            plate: pendingPayment.plate,
            ownerId: searchResult.ownerId || 'N/A',
            vehicleType: pendingPayment.vehicleType,
            entryTime: searchResult.entryTime,
            exitTime: Date.now(),
            durationStr: pendingPayment.durationStr,
            cost: pendingPayment.cost,
            paymentMethod: method,
            spotNumber: searchResult.spotNumber,
            isDisabled: pendingPayment.isDisabled
        });

        // Update local search result to reflect payment immediately
        setSearchResult({
            ...searchResult,
            paymentStatus: 'PAID',
            paymentMethod: method
        });

        setPendingPayment(null);
        setPaymentSuccess(true);
        speak("Pago exitoso. Su recibo se está descargando.");
    };

    const handleDownloadReceipt = () => {
        if (!searchResult) return;

        const { cost, minutes } = calculateCost(searchResult.entryTime, searchResult.vehicleType, searchResult.isDisabled, searchResult.requiresCharging);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

        generateInvoice({
            id: searchResult.id,
            plate: searchResult.plate,
            ownerId: searchResult.ownerId || 'N/A',
            vehicleType: searchResult.vehicleType,
            entryTime: searchResult.entryTime,
            exitTime: Date.now(),
            durationStr: durationStr,
            cost: searchResult.cost || cost,
            paymentMethod: searchResult.paymentMethod || 'Efectivo',
            spotNumber: searchResult.spotNumber,
            isDisabled: searchResult.isDisabled
        });
    };

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
    };

    // Calculate current stats for display
    const currentStats = searchResult ? calculateCost(searchResult.entryTime, searchResult.vehicleType, searchResult.isDisabled, searchResult.requiresCharging, searchResult.plate) : { cost: 0, minutes: 0, specialRateLabel: undefined, specialRate: undefined };

    return (
        <div className="min-h-screen bg-[#1E1E2E] text-white selection:bg-indigo-500 selection:text-white">
            {/* Background Gradients */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[100px]"></div>
            </div>

            {/* Header */}
            <div className="relative z-10 pt-8 pb-6 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-6">
                        <div className={`flex items-center justify-center transition-all ${clientLogo ? 'bg-white/5 p-1 rounded-xl backdrop-blur-md border border-white/10 shadow-2xl' : 'p-4 bg-white/5 border border-white/10 rounded-2xl'}`}>
                            {clientLogo ? (
                                <img src={clientLogo} alt="Logo" className="h-16 w-auto object-contain drop-shadow-2xl" />
                            ) : (
                                <Search className="w-8 h-8 text-indigo-400" />
                            )}
                        </div>
                        <div className="h-12 w-px bg-white/10 hidden md:block"></div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent tracking-tight">
                                Pasarela de Pagos
                            </h1>
                            <p className="text-indigo-200/50 text-sm font-bold tracking-widest uppercase">
                                Búsqueda y gestión de ingresos
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">

                {/* Search Box - Dark Mode Premium */}
                <div className="bg-[#27273A] p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/5 relative overflow-hidden mb-10">
                    {/* Decorative Element */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

                    <div className="relative z-10 text-center mb-10">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-3">Encuentra tu Vehículo</h2>
                        <p className="text-indigo-200/50 text-lg">Ingresa la placa para consultar ubicación y valor</p>
                    </div>

                    <div className="relative z-10 max-w-2xl mx-auto">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input
                                type="text"
                                value={searchPlate}
                                onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="PLACA (EJ: ABC123)"
                                maxLength={7}
                                className="flex-1 text-center text-3xl sm:text-4xl font-mono font-bold uppercase py-6 px-6 bg-[#161622] border-2 border-[#36364A] rounded-2xl focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all text-white placeholder-white/10 tracking-wider shadow-inner"
                            />
                            <button
                                onClick={handleSearch}
                                className="w-full sm:w-auto px-10 py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xl transition-all shadow-lg hover:shadow-indigo-500/40 active:scale-95 flex items-center justify-center gap-3"
                            >
                                <Search size={28} />
                                <span className="hidden sm:inline">Buscar</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search Result */}
                {searchResult && (
                    <div className="bg-[#27273A] rounded-[2.5rem] border border-white/5 overflow-hidden animate-fade-in-up shadow-2xl">

                        {/* Result Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 md:p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div>
                                    <p className="text-indigo-100/80 font-semibold mb-1 uppercase tracking-wider text-xs">Vehículo Encontrado</p>
                                    <h3 className="text-5xl md:text-6xl font-black text-white tracking-tight">{searchResult.plate}</h3>
                                </div>
                                <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                                    {searchResult.vehicleType === VehicleType.CAR ? <Car size={48} className="text-white" /> : <Bike size={48} className="text-white" />}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-10">

                            {/* Success Message */}
                            {paymentSuccess && (
                                <div className="mb-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-emerald-500 p-3 rounded-full text-white shadow-lg shadow-emerald-500/30">
                                            <CheckCircle size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-white">¡Pago Exitoso!</h4>
                                            <p className="text-emerald-200/70 text-sm">Transacción completada correctamente.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleDownloadReceipt}
                                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                    >
                                        <Download size={20} />
                                        Descargar Recibo
                                    </button>
                                </div>
                            )}

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
                                {/* Location */}
                                <div className="bg-[#1E1E2E] p-6 rounded-3xl border border-white/5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                                        <MapPin className="text-orange-500" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Ubicación</p>
                                        <p className="text-xl font-bold text-white">
                                            {(() => {
                                                const floor = floors?.find(f => f.id === searchResult.floorId);
                                                const floorName = floor ? floor.name : 'Piso 1';
                                                const typeText = searchResult.vehicleType === VehicleType.MOTORCYCLE ? "Zona Motos" : `Puesto ${searchResult.spotNumber}`;
                                                return `${floorName} - ${typeText}`;
                                            })()}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 text-emerald-400 font-bold text-xs uppercase animate-pulse">
                                            <Info size={12} />
                                            Ruta: {(() => {
                                                const floor = floors?.find(f => f.id === searchResult.floorId);
                                                if (floor && floor.name.includes('2')) {
                                                    return "Siga por la rampa al Segundo Piso";
                                                }
                                                return "Siga derecho por el Primer Piso";
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Entry Time */}
                                <div className="bg-[#1E1E2E] p-6 rounded-3xl border border-white/5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                                        <Clock className="text-blue-500" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Tiempo Estacionado</p>
                                        <p className="text-xl font-bold text-white">
                                            {formatDuration(currentStats.minutes)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Section */}
                            <div className="bg-[#1E1E2E] rounded-3xl p-8 border border-white/5">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div className="text-center md:text-left">
                                        <p className="text-white/40 text-sm font-bold uppercase mb-2">Total a Pagar</p>
                                        <div className="flex flex-col gap-1">
                                            {currentStats.specialRateLabel && (
                                                <div className="space-y-2 mb-3">
                                                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-wider bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20 w-fit">
                                                        <Info size={12} />
                                                        {currentStats.specialRateLabel}
                                                    </div>
                                                    {currentStats.specialRate && (
                                                        <div className="flex flex-col gap-1 ml-1">
                                                            <div className="flex items-center gap-2 text-[10px] text-indigo-200/60 font-medium">
                                                                <DollarSign size={10} className="text-emerald-400" />
                                                                Valor Mensualidad: ${currentStats.specialRate.value.toLocaleString()}
                                                            </div>
                                                            {currentStats.specialRate.expirationDate && (
                                                                <div className="flex items-center gap-2 text-[10px] text-indigo-200/60 font-medium">
                                                                    <Clock size={10} className="text-indigo-400" />
                                                                    Vence el: {new Date(currentStats.specialRate.expirationDate).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                                                    ${currentStats.cost.toLocaleString()}
                                                </span>
                                                {searchResult.status === 'ACTIVE' && searchResult.paymentStatus !== 'PAID' && (
                                                    <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-1 rounded-md border border-orange-500/20">PENDIENTE</span>
                                                )}
                                            </div>
                                        </div>

                                        {searchResult.paymentStatus !== 'PAID' && currentStats.cost > 0 ? (
                                            <div className="flex flex-col gap-4 w-full md:w-auto mt-4">
                                                <div className="bg-[#161622] p-4 rounded-xl border border-white/10">
                                                    <label className="block text-indigo-200/60 text-xs font-bold uppercase mb-2">Confirmar No. Documento</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ingrese Cédula del Propietario"
                                                        className="w-full bg-[#1E1E2E] border border-[#36364A] rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 transition-colors text-center font-mono"
                                                        id="verify-id-input"
                                                    />
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        const input = document.getElementById('verify-id-input') as HTMLInputElement;
                                                        const val = input.value.trim();
                                                        if (!searchResult.ownerId) {
                                                            alert("Error: Este vehículo no tiene un documento asociado para verificar. Contacte al administrador.");
                                                            return;
                                                        }
                                                        if (val === searchResult.ownerId) {
                                                            handleInitiatePayment();
                                                        } else {
                                                            speak("Documento incorrecto.");
                                                            alert("El número de documento no coincide con el registrado de ingreso.");
                                                        }
                                                    }}
                                                    className="w-full px-10 py-5 bg-white text-indigo-900 hover:bg-indigo-50 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3"
                                                >
                                                    <CreditCard size={24} />
                                                    VERIFICAR Y PAGAR
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="mt-4 px-8 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 font-bold flex items-center gap-3">
                                                <CheckCircle size={24} />
                                                {currentStats.cost === 0 ? "GRATIS / PERIODO DE GRACIA" : "PAGADO"}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Map Action */}
                                <button
                                    onClick={() => setShowMap(true)}
                                    className="mt-6 w-full py-4 text-indigo-300 hover:text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 group"
                                >
                                    <MapPin size={16} className="group-hover:scale-110 transition-transform" /> Ver ubicación exacta en el mapa
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State Info */}
                {!searchResult && !errorMsg && (
                    <div className="text-center mt-12 opacity-40">
                        <div className="inline-flex items-center justify-center p-4 rounded-full bg-white/5 mb-4">
                            <CreditCard size={24} className="text-white" />
                        </div>
                        <p className="text-sm text-indigo-100">Pagos seguros con PSE y Tarjetas</p>
                    </div>
                )}
            </div>

            {/* Modals and Toasts */}
            {errorMsg && (
                <Toast
                    message={errorMsg}
                    type="error"
                    onClose={() => setErrorMsg(null)}
                />
            )}

            {showMap && searchResult && (
                <ParkingMapModal
                    records={records}
                    capacities={capacities}
                    onClose={() => setShowMap(false)}
                    highlightedPlate={searchResult.plate}
                    allowEdit={false}
                    floors={floors}
                    isPublicView={true}
                />
            )}

            {pendingPayment && (
                <PaymentModal
                    plate={pendingPayment.plate}
                    vehicleType={pendingPayment.vehicleType}
                    duration={pendingPayment.durationStr}
                    cost={pendingPayment.cost}
                    originalCost={pendingPayment.originalCost}
                    isDisabled={pendingPayment.isDisabled}
                    records={records}
                    onConfirm={handlePaymentConfirm}
                    onCancel={() => setPendingPayment(null)}
                />
            )}
        </div>
    );
};
