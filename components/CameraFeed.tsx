import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

interface CameraFeedProps {
  onCapture: (imageData: string) => void;
  isProcessing: boolean;
  mode: 'ENTRY' | 'EXIT';
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ onCapture, isProcessing, mode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer back camera
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvas.toDataURL('image/jpeg', 0.95);
        onCapture(imageData);
      }
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-2xl shadow-xl bg-black aspect-[3/4] md:aspect-video">
      {error ? (
        <div className="flex flex-col items-center justify-center h-full text-white p-4 text-center">
          <p className="mb-4">{error}</p>
          <button
            onClick={startCamera}
            className="px-4 py-2 bg-blue-600 rounded-full hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay Guide */}
          <div className="absolute inset-0 border-2 border-white/30 pointer-events-none m-8 rounded-lg flex items-center justify-center">
            <div className="text-white/50 text-sm font-mono bg-black/50 px-2 rounded">
              Alinea la Placa Aquí
            </div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-4">
            <button
              onClick={handleCapture}
              disabled={isProcessing}
              className={`p-4 rounded-full border-4 border-white transition-all transform active:scale-95 ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-lg'
                }`}
            >
              {isProcessing ? (
                <RefreshCw className="w-8 h-8 text-white animate-spin" />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
