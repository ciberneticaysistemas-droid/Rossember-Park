import React, { useState } from 'react';
import { CameraFeed } from '../components/CameraFeed';
import { VehicleCard } from '../components/VehicleCard';
import { VirtualKeyboard } from '../components/VirtualKeyboard';
import { AdDisplay } from '../components/AdDisplay';
import { analyzeImage } from '../services/geminiService';
import { ParkingRecord, VehicleType, SpecialRate, SpecialRateType, Floor } from '../types';
import { useVoice } from '../hooks/useVoice';
import { Car, Bike, LogIn, Activity, AlertCircle, User, Keyboard, Camera as CameraIcon, Accessibility, Zap, MapPin, ArrowLeft, CheckCircle, ShieldAlert, Calendar } from 'lucide-react';
import { ParkingLayoutMap } from '../components/ParkingLayoutMap';

interface EntryViewProps {
    records: ParkingRecord[];
    capacities: { REGULAR_CAR: number; PRIORITY_CAR: number; MOTO: number; EV_CHARGING: number };
    advertisements: string[];
    adTrigger?: number;
    onProcessEntry: (plate: string, vehicleType: VehicleType, ownerId: string, imageData: string | null, isAccessibility: boolean, requiresCharging?: boolean) => { record: ParkingRecord | null, error?: string };
    onBackToSelector: () => void;
    onCancelEntry: (recordId: string) => void;
    clientLogo?: string | null;
    specialRates: SpecialRate[];
    floors?: Floor[];
}

export const EntryView: React.FC<EntryViewProps> = ({
    records,
    capacities,
    advertisements,
    adTrigger = 0,
    onProcessEntry,
    onBackToSelector,
    onCancelEntry,
    clientLogo,
    specialRates,
    floors
}) => {
    const { speak } = useVoice();
    const [isProcessing, setIsProcessing] = useState(false);
    const [ownerIdInput, setOwnerIdInput] = useState('');
    const [isAccessibilityMode, setIsAccessibilityMode] = useState(false);
    const [requiresCharging, setRequiresCharging] = useState(false);

    // Manual Input State
    const [isManualInput, setIsManualInput] = useState(false);
    const [manualPlate, setManualPlate] = useState('');

    const [manualType, setManualType] = useState<VehicleType>(VehicleType.CAR);
    const [isSpecialPlate, setIsSpecialPlate] = useState(false);

    // Virtual Keyboard State
    const [activeInput, setActiveInput] = useState<'ownerId' | 'manualPlate' | null>(null);

    // Feedback State
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [lastProcessed, setLastProcessed] = useState<{
        plate: string;
        ownerId: string;
        vehicleType: VehicleType;
        img: string;
        timestamp: number;
        isDisabled?: boolean;
        spotNumber?: string;
        floorName?: string;
        requiresCharging?: boolean;
        recordId?: string;
        specialRate?: SpecialRate;
    } | null>(null);

    const activeRecords = records.filter(r => r.status === 'ACTIVE');

    const handleVirtualKeyPress = (key: string) => {
        if (activeInput === 'ownerId') {
            setOwnerIdInput(prev => prev + key);
        } else if (activeInput === 'manualPlate') {
            setManualPlate(prev => (prev + key).toUpperCase());
        }
    };

    const handleVirtualBackspace = () => {
        if (activeInput === 'ownerId') {
            setOwnerIdInput(prev => prev.slice(0, -1));
        } else if (activeInput === 'manualPlate') {
            setManualPlate(prev => prev.slice(0, -1));
        }
    };

    const handleCapture = async (imageData: string) => {
        setErrorMsg(null);
        setLastProcessed(null);

        if (!ownerIdInput.trim()) {
            setErrorMsg("⚠️ Por favor ingresa el número de Cédula o Documento antes de escanear.");
            return;
        }

        setIsProcessing(true);

        try {
            const result = await analyzeImage(imageData);

            if (result.detected && result.plate.length >= 4) {
                // If requiring charging, force type to ELECTRIC if it was detected as CAR
                let vType = result.vehicleType === VehicleType.UNKNOWN ? VehicleType.CAR : result.vehicleType;
                if (requiresCharging && vType === VehicleType.CAR) {
                    vType = VehicleType.ELECTRIC;
                }

                const specialRate = specialRates.find(r => r.plate === result.plate.toUpperCase() && r.isActive);
                if (specialRate) {
                    const isExpired = specialRate.expirationDate && specialRate.expirationDate < Date.now();
                    if (isExpired) {
                        speak(`Atención. Su mensualidad para la placa ${result.plate} ha vencido. Por favor, acuda a la administración para renovarla.`);
                        setErrorMsg(`⚠️ La mensualidad para la placa ${result.plate} ha VENCIDO. Se le cobrará tarifa normal.`);
                    } else {
                        speak(`Bienvenido. Detectada ${specialRate.type} para la placa ${result.plate}.`);
                    }
                } else {
                    speak("Vehículo procesado. Bienvenido.");
                }

                const { record: resultRecord, error: processError } = onProcessEntry(result.plate, vType, ownerIdInput.trim(), imageData, isAccessibilityMode, requiresCharging);

                if (resultRecord) {
                    const spotStr = resultRecord.spotNumber || 'Asignado';
                    speak(`Bienvenido a Rossember Parking. Puesto asignado: ${spotStr}`);

                    // Show success feedback
                    setLastProcessed({
                        plate: result.plate,
                        ownerId: ownerIdInput.trim(),
                        vehicleType: vType,
                        img: imageData,
                        timestamp: Date.now(),
                        isDisabled: isAccessibilityMode,
                        spotNumber: spotStr,
                        requiresCharging: requiresCharging,
                        recordId: resultRecord.id,
                        specialRate: specialRate || undefined
                    });

                    // Reset fields
                    setIsAccessibilityMode(false);
                    setRequiresCharging(false);
                    setOwnerIdInput('');
                    setActiveInput(null);
                } else {
                    setErrorMsg(processError || "⚠️ No hay plazas disponibles para este tipo de vehículo.");
                    speak(processError || "Lo sentimos, no hay plazas disponibles.");
                }
            } else {
                setErrorMsg("La IA de Gemini no detectó una placa clara. Intenta nuevamente o usa el ingreso manual.");
            }
        } catch (e) {
            console.error(e);
            setErrorMsg("Error procesando la imagen con Gemini. Verifica tu API Key o conexión.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManualSubmit = () => {
        setErrorMsg(null);
        setLastProcessed(null);

        if (!manualPlate.trim()) {
            setErrorMsg("⚠️ Por favor escribe la placa.");
            return;
        }

        // Validate Plate
        const validatePlate = (plate: string, type: VehicleType): boolean => {
            if (isSpecialPlate) return true;
            if (type === VehicleType.CAR || type === VehicleType.ELECTRIC) {
                return /^[A-Z]{3}[0-9]{3}$/.test(plate);
            }
            if (type === VehicleType.MOTORCYCLE) {
                return /^[A-Z]{3}[0-9]{2}[A-Z]$/.test(plate);
            }
            return true;
        };

        if (!validatePlate(manualPlate, manualType) && !isSpecialPlate) {
            setErrorMsg("⚠️ Placa no válida. Formato incorrecto.");
            speak("Placa no válida");
            return;
        }

        if (!ownerIdInput.trim()) {
            setErrorMsg("⚠️ Por favor ingresa el número de Cédula o Documento.");
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            // Adjust type if charging is required
            const finalType = (requiresCharging && manualType === VehicleType.CAR) ? VehicleType.ELECTRIC : manualType;

            const specialRate = specialRates.find(r => r.plate === manualPlate.toUpperCase() && r.isActive);
            const { record: resultRecord, error: processError } = onProcessEntry(manualPlate.toUpperCase(), finalType, ownerIdInput.trim(), null, isAccessibilityMode, requiresCharging);

            if (resultRecord) {
                const spotStr = resultRecord.spotNumber || 'Asignado';
                if (specialRate) {
                    const isExpired = specialRate.expirationDate && specialRate.expirationDate < Date.now();
                    if (isExpired) {
                        speak(`Atención. Su mensualidad para la placa ${manualPlate.toUpperCase()} ha vencido. Por favor, acuda a la administración para renovarla. Puesto asignado: ${spotStr}`);
                        setErrorMsg(`⚠️ La mensualidad para la placa ${manualPlate.toUpperCase()} ha VENCIDO. Se le cobrará tarifa normal.`);
                    } else {
                        speak(`Bienvenido. Detectada ${specialRate.type} para la placa ${manualPlate.toUpperCase()}. Puesto asignado: ${spotStr}`);
                    }
                } else {
                    speak(`Bienvenido a Rossember Parking. Puesto asignado: ${spotStr}`);
                }

                setLastProcessed({
                    plate: manualPlate.toUpperCase(),
                    ownerId: ownerIdInput.trim(),
                    vehicleType: finalType,
                    img: '',
                    timestamp: Date.now(),
                    isDisabled: isAccessibilityMode,
                    spotNumber: spotStr,
                    requiresCharging: requiresCharging,
                    recordId: resultRecord.id,
                    specialRate: specialRate || undefined
                });

                // Reset
                setManualPlate('');
                setOwnerIdInput('');
                setIsAccessibilityMode(false);
                setRequiresCharging(false);
                setActiveInput(null);
            } else {
                setErrorMsg(processError || "⚠️ No hay plazas disponibles o el vehículo ya está registrado.");
                speak(processError || "Lo sentimos, no hay plazas disponibles.");
            }
            setIsProcessing(false);
        }, 500);
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 ${activeInput ? 'pb-96' : 'pb-8'}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className={`flex items-center justify-center transition-all ${clientLogo ? 'bg-white/10 p-1 rounded-lg backdrop-blur-md border border-white/20 shadow-lg' : 'bg-white/20 p-3 rounded-xl'}`}>
                                    {clientLogo ? (
                                        <img src={clientLogo} alt="Logo" className="h-14 w-auto object-contain filter drop-shadow-sm" />
                                    ) : (
                                        <LogIn className="w-8 h-8" />
                                    )}
                                </div>
                                <button
                                    onClick={onBackToSelector}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors group"
                                    title="Volver"
                                >
                                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                                </button>
                            </div>
                            <div className="h-10 w-px bg-white/20 hidden md:block"></div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Estación de Entrada</h1>
                                <p className="text-blue-100 text-sm font-medium opacity-90">Registro de vehículos</p>
                            </div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                                <Activity size={18} />
                                <span className="text-sm font-semibold">Ocupación Actual</span>
                            </div>
                            <p className="text-3xl font-bold">{activeRecords.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                <div className="grid lg:grid-cols-12 gap-8">

                    {/* Left: Scanner Section */}
                    <section className="lg:col-span-7 space-y-6">
                        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-premium border border-blue-100">

                            {/* Owner ID Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Documento del Propietario *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User size={20} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={ownerIdInput}
                                        onFocus={() => setActiveInput('ownerId')}
                                        onChange={(e) => setOwnerIdInput(e.target.value)}
                                        placeholder="Ingrese Cédula o Documento"
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-lg transition-all text-gray-900 placeholder-gray-400 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Toggles Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                {/* Accessibility Toggle */}
                                <button
                                    onClick={() => setIsAccessibilityMode(!isAccessibilityMode)}
                                    className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold transition-all border-2 ${isAccessibilityMode
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <Accessibility size={20} />
                                    {isAccessibilityMode ? 'Prioridad ACTIVA' : 'Prioridad'}
                                </button>

                                {/* EV Charging Toggle */}
                                <button
                                    onClick={() => setRequiresCharging(!requiresCharging)}
                                    className={`flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl text-sm font-bold transition-all border-2 ${requiresCharging
                                        ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-200'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Zap size={20} />
                                        <span>{requiresCharging ? 'Carga EV ACTIVA' : 'Puesto de carga electricos'}</span>
                                    </div>
                                    <span className="text-[10px] opacity-80 font-normal leading-tight">(Reserva con empresa autorizada)</span>
                                </button>
                            </div>

                            {/* Camera or Manual Input */}
                            {isManualInput ? (
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border-2 border-dashed border-blue-300 min-h-[400px] flex flex-col justify-center gap-6">
                                    <div className="text-center mb-2">
                                        <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                                            <Keyboard size={32} className="text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800">Ingreso Manual</h3>
                                        <p className="text-sm text-gray-500">Si la cámara no reconoce la placa</p>
                                    </div>

                                    {/* Vehicle Type Selector */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setManualType(VehicleType.CAR)}
                                            className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${manualType === VehicleType.CAR
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                                : 'bg-white border-gray-300 text-gray-600 hover:border-blue-300'
                                                }`}
                                        >
                                            <Car size={32} className="mb-2" />
                                            <span className="text-base font-bold">Carro</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setManualType(VehicleType.MOTORCYCLE)}
                                            className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${manualType === VehicleType.MOTORCYCLE
                                                ? 'bg-orange-600 border-orange-600 text-white shadow-lg'
                                                : 'bg-white border-gray-300 text-gray-600 hover:border-orange-300'
                                                }`}
                                        >
                                            <Bike size={32} className="mb-2" />
                                            <span className="text-base font-bold">Moto</span>
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 uppercase mb-2 ml-1">Número de Placa</label>
                                        <input
                                            type="text"
                                            value={manualPlate}
                                            onFocus={() => setActiveInput('manualPlate')}
                                            onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                                            placeholder="AAA123"
                                            maxLength={7}
                                            className="w-full text-center text-4xl font-mono font-bold uppercase py-5 bg-white border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder-gray-300 cursor-pointer"
                                        />
                                    </div>

                                    <div className="flex justify-center">
                                        <button
                                            onClick={() => setIsSpecialPlate(!isSpecialPlate)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${isSpecialPlate
                                                ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                                                }`}
                                        >
                                            <ShieldAlert size={16} />
                                            {isSpecialPlate ? 'Excepción Activada' : 'Placa Especial / Excepción'}
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleManualSubmit}
                                        disabled={isProcessing}
                                        className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg active:scale-95 bg-blue-600 hover:bg-blue-700"
                                    >
                                        {isProcessing ? 'Procesando...' : 'Registrar Ingreso'}
                                    </button>
                                </div>
                            ) : (
                                <div className="transition-all duration-300 rounded-2xl p-1 relative bg-gradient-to-b from-blue-500 to-blue-300">
                                    {(isAccessibilityMode || requiresCharging) && (
                                        <div className="absolute top-0 right-0 left-0 bg-gray-900/80 text-white text-xs font-bold text-center py-2 rounded-t-xl z-10 flex items-center justify-center gap-3 backdrop-blur-sm">
                                            {isAccessibilityMode && <span className="flex items-center gap-1 text-blue-200"><Accessibility size={12} /> PRIORIDAD</span>}
                                            {requiresCharging && <span className="flex items-center gap-1 text-green-300"><Zap size={12} /> CARGA EV</span>}
                                        </div>
                                    )}
                                    <CameraFeed onCapture={handleCapture} isProcessing={isProcessing} mode="ENTRY" />
                                </div>
                            )}

                            {/* Toggle Button */}
                            <div className="flex justify-center mt-6">
                                <button
                                    onClick={() => setIsManualInput(!isManualInput)}
                                    className="text-base font-semibold text-blue-600 hover:text-blue-700 underline flex items-center gap-2 transition-colors"
                                >
                                    {isManualInput ? (
                                        <><CameraIcon size={20} /> Usar Cámara / Escáner</>
                                    ) : (
                                        <><Keyboard size={20} /> Escribir placa manualmente</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {errorMsg && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex items-start gap-3 text-red-700 animate-pulse shadow-md">
                                <AlertCircle size={24} className="mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold text-base">Error de Proceso</p>
                                    <p className="text-sm opacity-90">{errorMsg}</p>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Right: Active Vehicles List (HIDDEN FOR PRIVACY as per user request) & Success Feedback */}
                    <section className="lg:col-span-5 flex flex-col gap-6">
                        {/* Success Feedback - MOVED HERE */}
                        {lastProcessed && !errorMsg && (
                            <div className="rounded-2xl p-6 border-2 shadow-lg animate-fade-in-up bg-blue-50 border-blue-200 sticky top-8">
                                <div className="flex flex-col gap-4">
                                    <div className="w-full h-48 rounded-xl bg-gray-200 overflow-hidden shrink-0 border-2 border-blue-300 shadow-md flex items-center justify-center">
                                        {lastProcessed.img ? (
                                            <img src={lastProcessed.img} alt="Capture" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-blue-400">
                                                {lastProcessed.vehicleType === VehicleType.CAR || lastProcessed.vehicleType === VehicleType.ELECTRIC ? <Car size={64} /> : <Bike size={64} />}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold uppercase tracking-wider mb-2 text-blue-600 flex items-center gap-2">
                                            <CheckCircle size={18} /> Entrada Registrada Exitosamente
                                        </p>
                                        <h3 className="text-5xl font-black text-gray-900 tracking-tight mb-4">{lastProcessed.plate}</h3>

                                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 mb-6">
                                            <span className="bg-white px-3 py-1 rounded-lg border border-blue-200 font-semibold">
                                                {lastProcessed.vehicleType}
                                            </span>
                                            {lastProcessed.ownerId && (
                                                <span className="bg-white px-3 py-1 rounded-lg border border-blue-200 flex items-center gap-1">
                                                    <User size={12} /> {lastProcessed.ownerId}
                                                </span>
                                            )}
                                            {lastProcessed.specialRate && (
                                                <div className="w-full mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col gap-1">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{lastProcessed.specialRate.type}</span>
                                                        <span className="text-xs font-bold text-indigo-700">
                                                            {lastProcessed.specialRate.type === SpecialRateType.MONTHLY
                                                                ? `$${lastProcessed.specialRate.value.toLocaleString()}`
                                                                : `-${lastProcessed.specialRate.value}%`}
                                                        </span>
                                                    </div>
                                                    {lastProcessed.specialRate.expirationDate && (
                                                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                            <Calendar size={12} className="text-indigo-400" />
                                                            Vence: {new Date(lastProcessed.specialRate.expirationDate).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Map Visualization */}
                                        <div className="mb-4">
                                            {(() => {
                                                const record = records.find(r => r.id === lastProcessed.recordId);
                                                const floor = floors?.find(f => f.id === record?.floorId);
                                                return (
                                                    <ParkingLayoutMap
                                                        highlightedSpot={lastProcessed.spotNumber}
                                                        isEntryAssignment
                                                        records={records}
                                                        floorId={floor?.id}
                                                        floorName={floor?.name}
                                                        capacities={floor?.capacities}
                                                        prefixes={floor?.prefixes}
                                                    />
                                                );
                                            })()}
                                        </div>

                                        {/* Spot Assignment */}
                                        <div className={`p-5 rounded-2xl flex items-center gap-4 ${lastProcessed.requiresCharging
                                            ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                                            : lastProcessed.vehicleType === VehicleType.MOTORCYCLE
                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                                                : 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                            }`}>
                                            <MapPin size={32} className="shrink-0" />
                                            <div className="leading-tight">
                                                <p className="text-xs opacity-80 uppercase tracking-widest font-semibold mb-1">Asignación de Puesto</p>
                                                <p className="font-bold text-2xl">
                                                    Puesto {lastProcessed.spotNumber}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Report Bad Reading Button */}
                                        <button
                                            onClick={() => {
                                                if (lastProcessed.recordId) {
                                                    onCancelEntry(lastProcessed.recordId);
                                                    setManualPlate(lastProcessed.plate);
                                                    setManualType(lastProcessed.vehicleType);
                                                    setIsManualInput(true);
                                                    setLastProcessed(null);
                                                    setErrorMsg(null);
                                                    // Optional: speak("Por favor corrija la placa manualmente");
                                                }
                                            }}
                                            className="mt-4 w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                        >
                                            <AlertCircle size={16} />
                                            REPORTAR MALA LECTURA
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Advertisements - MOVED BELOW */}
                        {advertisements.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-premium border border-gray-100 p-2">
                                <AdDisplay ads={advertisements} adTrigger={adTrigger} className="aspect-video w-full rounded-xl" />
                            </div>
                        )}

                        {/* Hidden Active List */}
                    </section>
                </div>
            </div>

            {/* Virtual Keyboard */}
            <VirtualKeyboard
                isVisible={activeInput !== null}
                onKeyPress={handleVirtualKeyPress}
                onBackspace={handleVirtualBackspace}
                onClose={() => setActiveInput(null)}
            />
        </div>
    );
};
