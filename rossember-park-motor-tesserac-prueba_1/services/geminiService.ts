import { GoogleGenAI } from "@google/genai";
import { RecognitionResult, VehicleType, VehicleDetails } from "../types";

// Initialize API Client
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const analyzeImage = async (base64Image: string): Promise<RecognitionResult> => {
  if (!ai) {
    console.error("API Key no encontrada en process.env.API_KEY");
    alert("⚠️ Falta la API KEY en el archivo .env\nPor favor configura tu clave de Google AI Studio y reinicia la terminal.");
    return {
      detected: false,
      vehicleType: VehicleType.UNKNOWN,
      plate: "",
      confidence: 0
    };
  }

  // Remove header data:image/jpeg;base64, if present
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      Actúa como un sistema de control de parqueadero en Colombia. Analiza esta imagen.
      1. Identifica si hay un vehículo (Carro o Moto).
      2. Lee la Placa del vehículo. Las placas colombianas son:
         - Carros: 3 Letras y 3 Números (Ej: AAA123).
         - Motos: 3 Letras, 2 Números y 1 Letra (Ej: AAA12C).
      3. Si la imagen es borrosa o no hay placa, retorna placa vacía.
      
      Responde SOLO en formato JSON crudo (sin markdown):
      {
        "detected": boolean,
        "vehicleType": "Carro" | "Moto" | "Desconocido",
        "plate": "string (SIN espacios, SIN guiones, MAYÚSCULAS)",
        "confidence": number (0-1)
      }
    `;

    console.log("Enviando imagen a Gemini...");
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        { text: prompt }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    console.log("Respuesta Gemini:", text);

    if (!text) throw new Error("No response from AI");

    // Limpiar Markdown si existe (```json ... ```)
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanText);

    // Mapeo seguro de tipos
    let type = VehicleType.UNKNOWN;
    if (result.vehicleType?.toLowerCase().includes('car')) type = VehicleType.CAR;
    if (result.vehicleType?.toLowerCase().includes('moto')) type = VehicleType.MOTORCYCLE;

    return {
      detected: result.detected,
      vehicleType: type,
      plate: result.plate || "",
      confidence: result.confidence || 0.8
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      detected: false,
      vehicleType: VehicleType.UNKNOWN,
      plate: "",
      confidence: 0
    };
  }
};

export const inspectVehicle = async (base64Image: string): Promise<VehicleDetails> => {
  if (!ai) return { make: "Error API", color: "Error", notes: "Falta API Key" };

  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        {
          text: `
          Analiza visualmente este vehículo para un reporte de auditoría.
          Retorna un JSON con:
          {
            "make": "Marca probable (ej: Mazda, Chevrolet)",
            "color": "Color principal",
            "notes": "Descripción breve (ej: Sedán con vidrios polarizados, golpe en bumper, etc)"
          }
        `}
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return { make: "-", color: "-", notes: "No se pudo analizar" };

    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);

  } catch (error) {
    console.error("Gemini Inspection Error:", error);
    return {
      make: "Error",
      color: "Error",
      notes: "Fallo en la inspección visual"
    };
  }
};