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

  const startCamera = useCallback(async () => {
    try {
      setError(null);

      // Enumerate all video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      console.log('Available video devices:', videoDevices);

      let constraints: MediaStreamConstraints;

      if (mode === 'EXIT') {
        // For EXIT mode, try to find and use a USB camera
        // USB cameras typically have labels containing "USB" or are not the default built-in camera
        const usbCamera = videoDevices.find(device =>
          device.label.toLowerCase().includes('usb') ||
          device.label.toLowerCase().includes('external') ||
          device.label.toLowerCase().includes('webcam')
        );

        if (usbCamera) {
          console.log('Using USB camera for EXIT mode:', usbCamera.label);
          constraints = {
            video: { deviceId: { exact: usbCamera.deviceId } },
            audio: false
          };
        } else {
          // If no USB camera found, use the last camera in the list (often external)
          const lastCamera = videoDevices[videoDevices.length - 1];
          console.log('No USB camera found, using last available camera:', lastCamera?.label);
          constraints = {
            video: lastCamera ? { deviceId: { exact: lastCamera.deviceId } } : { facingMode: 'environment' },
            audio: false
          };
        }
      } else {
        // For ENTRY mode, use default camera (first in list or environment facing)
        console.log('Using default camera for ENTRY mode');
        constraints = {
          video: { facingMode: 'environment' },
          audio: false
        };
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  }, [mode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Cleanup on unmount and restart when mode changes
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]); // Restart camera when mode changes

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvas.toDataURL('image/jpeg', 0.8);
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
              className={`p-4 rounded-full border-4 border-white transition-all transform active:scale-95 ${isProcessing
                ? 'bg-gray-400 cursor-not-allowed'
                : mode === 'ENTRY'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-lg'
                  : 'bg-orange-600 hover:bg-orange-700 shadow-lg'
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