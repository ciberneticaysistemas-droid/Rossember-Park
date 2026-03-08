import { RecognitionResult, VehicleType, VehicleDetails } from "../types";
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import Tesseract from 'tesseract.js';
import { preprocessImageForOCR, simplePreprocess } from './imageProcessor';

// Cache the model to avoid reloading it every time
let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let backendReady = false;

const initBackend = async () => {
  if (!backendReady) {
    await tf.ready();
    console.log('TensorFlow.js backend ready:', tf.getBackend());
    backendReady = true;
  }
};

const loadModel = async () => {
  if (!modelPromise) {
    await initBackend();
    console.log("Cargando modelo COCO-SSD local...");
    modelPromise = cocoSsd.load();
  }
  return modelPromise;
};

// Helper to convert base64 to HTMLImageElement
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const analyzeImage = async (base64Image: string): Promise<RecognitionResult> => {
  try {
    const imgElement = await loadImage(base64Image);
    const model = await loadModel();

    // 1. Object Detection (YOLO/COCO-SSD)
    const predictions = await model.detect(imgElement);

    // Check for vehicles
    const vehiclePred = predictions.find(p =>
      ['car', 'truck', 'bus', 'motorcycle'].includes(p.class)
    );

    let detectedType = VehicleType.UNKNOWN;

    if (vehiclePred) {
      if (vehiclePred.class === 'motorcycle') {
        detectedType = VehicleType.MOTORCYCLE;
      } else {
        detectedType = VehicleType.CAR;
      }
    } else {
      // If no vehicle detected but we proceed (fallback)
      // return { detected: false, vehicleType: VehicleType.UNKNOWN, plate: "", confidence: 0 };
      // We continue to try OCR just in case it's a close up of a plate
    }

    // 2. Preprocess image for better OCR
    let processedImage: string;
    try {
      processedImage = await preprocessImageForOCR(base64Image);
      console.log('✅ Image preprocessed successfully');
    } catch (error) {
      console.warn('⚠️ Full preprocessing failed, using simple preprocessing', error);
      try {
        processedImage = await simplePreprocess(base64Image);
      } catch (fallbackError) {
        console.warn('⚠️ Simple preprocessing failed, using original image', fallbackError);
        processedImage = base64Image;
      }
    }

    // 3. OCR with optimized Tesseract configuration for license plates
    const { data: { text } } = await Tesseract.recognize(processedImage, 'eng', {
      logger: undefined, // Disable logging for cleaner console
    });

    // Apply character filtering manually since Tesseract.js web version has limited config options
    console.log('📄 OCR Raw Text:', text);

    // Clean text: Keep only A-Z and 0-9
    const cleanText = text.replace(/[^A-Z0-9]/g, '');
    console.log('🧹 Cleaned Text:', cleanText);

    // 4. Find Colombian Plate Patterns
    // Patterns: AAA123 (Car) or AAA12C (Moto/New Car)
    // We look for a sequence of 6 alphanumeric characters
    const plateRegex = /[A-Z]{3}[0-9]{2}[0-9A-Z]/;
    const match = cleanText.match(plateRegex);

    let foundPlate = "";

    if (match) {
      foundPlate = match[0];
      console.log('✅ Plate found with regex:', foundPlate);
    } else {
      // Fallback: take the longest alphanumeric string if it's length 5 or 6
      // This helps if Tesseract misses one char or reads extra noise
      const possiblePlates = cleanText.match(/[A-Z0-9]{5,7}/g);
      if (possiblePlates && possiblePlates.length > 0) {
        // Sort by length and take the longest one
        foundPlate = possiblePlates.sort((a, b) => b.length - a.length)[0];

        // If it's 7 characters, try to fix common OCR errors
        if (foundPlate.length === 7) {
          // Take first 6 characters as plates are typically 6 chars
          foundPlate = foundPlate.substring(0, 6);
        }

        console.log('⚠️ Plate found with fallback:', foundPlate);
      } else {
        console.log('❌ No plate pattern found');
      }
    }

    // Heuristic: If we found a plate but no vehicle object, assume it's valid
    const isDetected = (!!vehiclePred || foundPlate.length >= 5);

    return {
      detected: isDetected,
      vehicleType: detectedType !== VehicleType.UNKNOWN ? detectedType : VehicleType.CAR, // Default to car if OCR found but detection didn't
      plate: foundPlate,
      confidence: vehiclePred ? vehiclePred.score : (foundPlate ? 0.8 : 0)
    };

  } catch (error) {
    console.error("Local recognition error:", error);
    return {
      detected: false,
      vehicleType: VehicleType.UNKNOWN,
      plate: "",
      confidence: 0
    };
  }
};

export const inspectVehicle = async (base64Image: string): Promise<VehicleDetails> => {
  // Since we removed Gemini, we can't do detailed visual inspection (color/make) 
  // easily with just COCO-SSD + Tesseract.
  // We will return generic info based on detection.

  try {
    const imgElement = await loadImage(base64Image);
    const model = await loadModel();
    const predictions = await model.detect(imgElement);

    const vehicle = predictions.find(p => ['car', 'truck', 'bus', 'motorcycle'].includes(p.class));

    if (vehicle) {
      return {
        make: "No disponible (Modo Local)",
        color: "No disponible (Modo Local)",
        notes: `Detectado: ${vehicle.class.toUpperCase()} (Confianza: ${Math.round(vehicle.score * 100)}%)`
      };
    }

    return {
      make: "Desconocido",
      color: "Desconocido",
      notes: "No se pudo identificar el vehículo claramente."
    };

  } catch (error) {
    return {
      make: "Error",
      color: "Error",
      notes: "Fallo en el sistema de inspección local."
    };
  }
};