import React, { useState } from 'react';
import { CameraFeed } from '../components/CameraFeed';
import { VirtualKeyboard } from '../components/VirtualKeyboard';
import { AdDisplay } from '../components/AdDisplay';
import { Toast } from '../components/Toast';
import { analyzeImage } from '../services/geminiService';
import { generateInvoice } from '../services/pdfService';
import { ParkingRecord, VehicleType, SpecialRate } from '../types';
import { useVoice } from '../hooks/useVoice';
import { Car, Bike, LogOut, Keyboard, Camera as CameraIcon, FileText, Activity, ArrowLeft, User, CheckCircle, ShieldAlert } from 'lucide-react';

interface ExitViewProps {
    records: ParkingRecord[];
    onProcessExit: (plate: string) => void;
    calculateCost: (entryTime: number, type: VehicleType, isDisabled?: boolean, requiresCharging?: boolean, plate?: string) => { cost: number; originalCost?: number; minutes: number; exitTime: number; specialRateLabel?: string; specialRate?: SpecialRate };
    onBackToSelector: () => void;
    advertisements: string[];
    adTrigger?: number;
    gracePeriod?: number;
    onRevertPayment?: (recordId: string) => void;
    clientLogo?: string | null;
}

export const ExitView: React.FC<ExitViewProps> = ({ records, onProcessExit, calculateCost, onBackToSelector, advertisements, adTrigger = 0, gracePeriod = 15, onRevertPayment, clientLogo }) => {
    const { speak } = useVoice();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isManualInput, setIsManualInput] = useState(false);
    const [manualPlate, setManualPlate] = useState('');
    const [activeInput, setActiveInput] = useState<'manualPlate' | null>(null);
    const [isSpecialPlate, setIsSpecialPlate] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    const [lastProcessed, setLastProcessed] = useState<{
        id?: string;
        plate: string;
        ownerId?: string;
        vehicleType: VehicleType;
        img: string;
        cost?: number;
        duration?: string;
        timestamp: number;
        isDisabled?: boolean;
        spotNumber?: string;
        paymentMethod?: string;
    } | null>(null);

    const handleVirtualKeyPress = (key: string) => {
        if (activeInput === 'manualPlate') {
            setManualPlate(prev => (prev + key).toUpperCase());
        }
    };

    const handleVirtualBackspace = () => {
        if (activeInput === 'manualPlate') {
            setManualPlate(prev => prev.slice(0, -1));
        }
    };

    const processExitCode = (record: ParkingRecord, currentImage?: string) => {
        const { cost, minutes } = calculateCost(record.entryTime, record.vehicleType, record.isDisabled, record.requiresCharging, record.plate);

        // 1. Check Grace Period Expiration (If already paid)
        if (record.paymentStatus === 'PAID' && record.exitTime) {
            const timeSincePayment = Date.now() - record.exitTime;
            const gracePeriodMs = gracePeriod * 60 * 1000;

            if (timeSincePayment > gracePeriodMs) {
                const minutesOver = Math.ceil((timeSincePayment - gracePeriodMs) / 60000);

                // Revert payment status to allow new payment
                if (onRevertPayment) {
                    onRevertPayment(record.id);
                }

                setToast({
                    message: `⚠️ Tiempo de gracia excedido por ${minutesOver} min. El estado de pago ha sido revertido. Por favor, diríjase al buscador para pagar el tiempo adicional.`,
                    type: 'warning'
                });
                speak("Tiempo de gracia excedido, por favor realice el pago adicional en el buscador");
                setIsProcessing(false);
                return;
            }
        }

        // 2. Verify payment status OR if cost is 0
        if (record.paymentStatus !== 'PAID' && cost > 0) {
            setToast({
                message: `⚠️ El vehículo ${record.plate} NO ha realizado el pago.`,
                type: 'error'
            });
            speak("Vehículo sin pago, por favor diríjase a la caja");
            setIsProcessing(false);
            return;
        }

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

        // Process exit
        onProcessExit(record.plate);
        speak("Gracias por su visita, vuelva pronto");

        setLastProcessed({
            id: record.id,
            plate: record.plate,
            ownerId: record.ownerId,
            vehicleType: record.vehicleType,
            img: currentImage || record.imageUrl || '',
            cost: record.cost || cost,
            duration: durationStr,
            timestamp: Date.now(),
            isDisabled: record.isDisabled,
            spotNumber: record.spotNumber,
            paymentMethod: record.paymentMethod
        });

        setIsProcessing(false);
    };

    const handleCapture = async (imageData: string) => {
        setToast(null);
        setLastProcessed(null);
        setIsProcessing(true);

        try {
            const result = await analyzeImage(imageData);

            if (result.detected && result.plate.length >= 4) {
                const existing = records.find(r => r.plate === result.plate && r.status === 'ACTIVE');

                if (!existing) {
                    setToast({ message: `⚠️ Vehículo ${result.plate} no encontrado.`, type: 'error' });
                    setIsProcessing(false);
                    return;
                }

                processExitCode(existing, imageData);
            } else {
                setToast({ message: "No se detectó placa. Intente de nuevo.", type: 'info' });
                setIsProcessing(false);
            }
        } catch (e) {
            console.error(e);
            setToast({ message: "Error de conexión con IA.", type: 'error' });
            setIsProcessing(false);
        }
    };

    const handleManualSubmit = () => {
        setToast(null);
        setLastProcessed(null);

        if (!manualPlate.trim()) {
            setToast({ message: "Escriba la placa.", type: 'warning' });
            return;
        }

        const isValidFormat = /^[A-Z]{3}[0-9]{3}$/.test(manualPlate) || /^[A-Z]{3}[0-9]{2}[A-Z]$/.test(manualPlate);

        if (!isValidFormat && !isSpecialPlate) {
            setToast({ message: "Formato de placa inválido.", type: 'error' });
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const existing = records.find(r => r.plate === manualPlate.toUpperCase() && r.status === 'ACTIVE');

            if (!existing) {
                setToast({ message: `Vehículo ${manualPlate.toUpperCase()} no encontrado.`, type: 'error' });
                setIsProcessing(false);
                return;
            }

            processExitCode(existing);
            setManualPlate('');
            setActiveInput(null);
        }, 500);
    };

    const handleDownloadInvoice = () => {
        if (!lastProcessed || !lastProcessed.cost) return;

        generateInvoice({
            id: lastProcessed.id || 'Unknown',
            plate: lastProcessed.plate,
            ownerId: lastProcessed.ownerId || 'N/A',
            vehicleType: lastProcessed.vehicleType,
            entryTime: Date.now(),
            exitTime: lastProcessed.timestamp,
            durationStr: lastProcessed.duration || '0 min',
            cost: lastProcessed.cost,
            paymentMethod: lastProcessed.paymentMethod || 'Efectivo',
            spotNumber: lastProcessed.spotNumber,
            isDisabled: lastProcessed.isDisabled
        });
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 ${activeInput ? 'pb-96' : 'pb-8'}`}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className={`flex items-center justify-center transition-all ${clientLogo ? 'bg-white/10 p-1 rounded-lg backdrop-blur-md border border-white/20 shadow-lg' : 'bg-white/20 p-3 rounded-xl'}`}>
                                    {clientLogo ? (
                                        <img src={clientLogo} alt="Logo" className="h-14 w-auto object-contain filter drop-shadow-sm" />
                                    ) : (
                                        <LogOut className="w-8 h-8" />
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
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Estación de Salida</h1>
                                <p className="text-orange-100 text-sm font-medium opacity-90">Verificación de Salida</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Left: Scanner Section */}
                    <section className="lg:col-span-7 space-y-6">
                        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-premium border border-orange-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Escanear Vehículo de Salida</h2>

                            {/* Camera or Manual Input */}
                            {isManualInput ? (
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border-2 border-dashed border-orange-300 min-h-[400px] flex flex-col justify-center gap-6">
                                    <div className="text-center mb-2">
                                        <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                                            <Keyboard size={32} className="text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800">Ingreso Manual de Placa</h3>
                                        <p className="text-sm text-gray-500">Si la cámara no reconoce la placa</p>
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
                                            className="w-full text-center text-4xl font-mono font-bold uppercase py-5 bg-white border-2 border-orange-300 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-500 outline-none transition-all text-gray-900 placeholder-gray-300 cursor-pointer"
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
                                        className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg active:scale-95 bg-orange-600 hover:bg-orange-700"
                                    >
                                        {isProcessing ? 'Procesando...' : 'Verificar Salida'}
                                    </button>
                                </div>
                            ) : (
                                <div className="transition-all duration-300 rounded-2xl p-1 relative bg-gradient-to-b from-orange-500 to-orange-300">
                                    <CameraFeed onCapture={handleCapture} isProcessing={isProcessing} mode="EXIT" />
                                </div>
                            )}

                            {/* Toggle Button */}
                            <div className="flex justify-center mt-6">
                                <button
                                    onClick={() => setIsManualInput(!isManualInput)}
                                    className="text-base font-semibold text-orange-600 hover:text-orange-700 underline flex items-center gap-2 transition-colors"
                                >
                                    {isManualInput ? (
                                        <><CameraIcon size={20} /> Usar Cámara / Escáner</>
                                    ) : (
                                        <><Keyboard size={20} /> Escribir placa manualmente</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Right: Recent Exits & Success Feedback */}
                    <section className="lg:col-span-5 flex flex-col gap-6">
                        {/* Success Feedback */}
                        {lastProcessed && (
                            <div className="rounded-2xl p-6 border-2 shadow-lg animate-fade-in-up bg-emerald-50 border-emerald-200 sticky top-8">
                                <div className="flex flex-col gap-4">
                                    <div className="w-full h-48 rounded-xl bg-gray-200 overflow-hidden shrink-0 border-2 border-emerald-300 shadow-md flex items-center justify-center">
                                        {lastProcessed.img ? (
                                            <img src={lastProcessed.img} alt="Capture" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-emerald-400">
                                                {lastProcessed.vehicleType === VehicleType.CAR ? <Car size={64} /> : <Bike size={64} />}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-sm font-bold uppercase tracking-wider mb-2 text-emerald-600 flex items-center gap-2">
                                                    <CheckCircle size={18} /> Salida Autorizada
                                                </p>
                                                <h3 className="text-5xl font-black text-gray-900 tracking-tight">{lastProcessed.plate}</h3>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 mb-6">
                                            <span className="bg-white px-3 py-1 rounded-lg border border-emerald-200 font-semibold">
                                                {lastProcessed.vehicleType}
                                            </span>
                                            {lastProcessed.ownerId && (
                                                <span className="bg-white px-3 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                                                    <User size={12} /> {lastProcessed.ownerId}
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-white p-3 rounded-xl border border-emerald-100">
                                                <p className="text-xs text-gray-500 mb-1">Duración</p>
                                                <p className="font-bold text-gray-900 flex items-center gap-1"><Activity size={14} /> {lastProcessed.duration || '0 min'}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-emerald-100">
                                                <p className="text-xs text-gray-500 mb-1">Costo Total</p>
                                                <p className="font-bold text-emerald-600 text-lg">${lastProcessed.cost?.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleDownloadInvoice}
                                            className="w-full mt-2 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-emerald-300 text-emerald-700 rounded-xl hover:bg-emerald-100 hover:border-emerald-400 transition-all text-lg font-bold"
                                        >
                                            <FileText size={20} />
                                            Reimprimir Factura
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Advertisements */}
                        {advertisements.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-premium border border-gray-100 p-2">
                                <AdDisplay ads={advertisements} adTrigger={adTrigger} className="aspect-video w-full rounded-xl" />
                            </div>
                        )}
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
