import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

interface CameraFeedProps {
  onCapture: (imageData: string) => void;
  isProcessing: boolean;
  mode?: 'ENTRY' | 'EXIT';
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ onCapture, isProcessing, mode = 'ENTRY' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = async (deviceId: string) => {
    try {
      console.log("Starting device:", deviceId);

      // Stop anything currently running
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      // Higher resolution ideal for license plates, but flexible to avoid errors
      const constraints = {
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setActiveDeviceId(deviceId);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        // Wait for metadata to be ready then play
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => {
            console.error("Play failed after metadata:", e);
          });
        };
      }
    } catch (err) {
      console.error("Critical camera start error:", err);
      // Fallback to default resolution if HD fails
      try {
        const fallbackConstraints = {
          video: { deviceId: { exact: deviceId } },
          audio: false
        };
        const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        setStream(fallbackStream);
        setActiveDeviceId(deviceId);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => {
              console.error("Play failed after fallback metadata:", e);
            });
          };
        }
      } catch (e2) {
        setError("Error: La cámara no responde. Revisa que no esté abierta en otra app.");
      }
    }
  };

  // Sync devices and select based on mode
  useEffect(() => {
    const syncDevices = async () => {
      try {
        // Simple permission check
        const initStream = await navigator.mediaDevices.getUserMedia({ video: true });
        initStream.getTracks().forEach(t => t.stop());

        const all = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = all.filter(d => d.kind === 'videoinput' && d.deviceId);
        setDevices(videoInputs);

        let selectedId = '';
        if (mode === 'EXIT') {
          // Priority: Logitech/Brio
          const brio = videoInputs.find(d => {
            const l = d.label.toLowerCase();
            return l.includes('brio') || l.includes('logitech') || l.includes('4k');
          });
          selectedId = (brio || videoInputs[videoInputs.length - 1])?.deviceId || '';
        } else {
          // Priority: Integrated (Not Logitech)
          const internal = videoInputs.find(d => {
            const l = d.label.toLowerCase();
            return (l.includes('integrated') || l.includes('pc camera') || l.includes('vga')) &&
              !(l.includes('logitech') || l.includes('brio'));
          });
          selectedId = (internal || videoInputs[0])?.deviceId || '';
        }

        if (selectedId) {
          startCamera(selectedId);
        }
      } catch (e) {
        setError("Permiso de cámara denegado.");
      }
    };

    syncDevices();
    return () => stopCamera();
  }, [mode]);

  const switchCamera = () => {
    if (devices.length < 2) return;
    const currentIdx = devices.findIndex(d => d.deviceId === activeDeviceId);
    const nextIdx = (currentIdx + 1) % devices.length;
    startCamera(devices[nextIdx].deviceId);
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        onCapture(canvas.toDataURL('image/jpeg', 0.8));
      }
    }
  };

  const activeLabel = devices.find(d => d.deviceId === activeDeviceId)?.label || 'Buscando...';

  return (
    <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-2xl shadow-2xl bg-black aspect-video border-4 border-white/5">
      {error ? (
        <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
          <p className="text-rose-400 font-bold mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 rounded-full">Recargar App</button>
        </div>
      ) : (
        <>
          {/* Key on video element forces clean remount on device switch */}
          <video
            key={activeDeviceId}
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => videoRef.current?.play()}
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Badge */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
            <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
              <span className="text-[11px] text-white font-black uppercase tracking-widest">{activeLabel}</span>
            </div>
            {devices.length > 1 && (
              <button onClick={switchCamera} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/20 text-white transition-all">
                <RefreshCw size={20} />
              </button>
            )}
          </div>

          {/* Capture Controls */}
          <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center">
            <button
              onClick={handleCapture}
              disabled={isProcessing}
              className={`p-6 rounded-full border-4 border-white transition-all active:scale-90 shadow-2xl ${isProcessing ? 'bg-slate-600' : mode === 'ENTRY' ? 'bg-blue-600 shadow-blue-500/20' : 'bg-orange-600 shadow-orange-500/20'
                }`}
            >
              {isProcessing ? <RefreshCw className="w-8 h-8 animate-spin" /> : <Camera className="w-8 h-8 text-white" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};