import { RecognitionResult, VehicleType, VehicleDetails } from "../types";

/**
 * ============================================================
 * Servicio de Gemini — Versión de SEGURIDAD TOTAL
 * ============================================================
 */

// Usamos la constante directamente para evitar fallos de lectura de .env/Vite en la presentación
const HARDCODED_KEY = "AIzaSyCLWnHJVDco8xtNfEm9BiqOR1maIAygKDU";

async function callGemini(contents: any[]): Promise<string> {
  const attempts = [
    { url: "v1beta", model: "gemini-2.0-flash" },
    { url: "v1beta", model: "gemini-flash-latest" },
    { url: "v1", model: "gemini-1.5-flash" },
    { url: "v1beta", model: "gemini-1.5-flash" },
  ];

  let lastError = "";

  for (const attempt of attempts) {
    try {
      const url = `https://generativelanguage.googleapis.com/${attempt.url}/models/${attempt.model}:generateContent?key=${HARDCODED_KEY}`;
      console.log(`[GeminiService] INTENTO: ${attempt.model} (${attempt.url})`);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      });

      const data = await response.json();
      if (response.ok) {
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }

      lastError = data.error?.message || JSON.stringify(data.error) || "Error desconocido";
      console.warn(`[GeminiService] Falló ${attempt.model} (${attempt.url}): ${lastError}`);
    } catch (e: any) {
      lastError = e.message;
      console.warn(`[GeminiService] Error en fetch ${attempt.model}: ${lastError}`);
    }
  }

  throw new Error(`Error en todos los intentos: ${lastError}`);
}

function cleanJsonResponse(text: string): any {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").replace(/JSON:/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("No se pudo extraer un JSON");
  }
}

export const analyzeImage = async (base64Image: string): Promise<RecognitionResult> => {
  const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

  const prompt = `
    Responde UNICAMENTE un JSON:
    {"detected": true, "vehicleType": "Carro", "plate": "ABC123", "confidence": 0.9}
  `;

  try {
    const text = await callGemini([{
      role: "user",
      parts: [
        { inline_data: { mime_type: "image/jpeg", data: base64Data } },
        { text: prompt }
      ]
    }]);

    const result = cleanJsonResponse(text);
    return {
      detected: result.detected && !!result.plate,
      vehicleType: (result.vehicleType || "").toLowerCase().includes("moto") ? VehicleType.MOTORCYCLE : VehicleType.CAR,
      plate: (result.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, ""),
      confidence: result.confidence || 0.8
    };
  } catch (error: any) {
    console.error("[GeminiService] Fallo categórico:", error);
    return { detected: false, vehicleType: VehicleType.UNKNOWN, plate: "", confidence: 0 };
  }
};

export const inspectVehicle = async (base64Image: string): Promise<VehicleDetails> => {
  const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
  try {
    const text = await callGemini([{
      role: "user",
      parts: [
        { inline_data: { mime_type: "image/jpeg", data: base64Data } },
        { text: "Analiza el vehículo y responde JSON: {\"make\":\"marca\",\"color\":\"color\",\"notes\":\"detalles\"}" }
      ]
    }]);
    return cleanJsonResponse(text);
  } catch (error) {
    console.error("[GeminiService] Fallo inspección:", error);
    return { make: "Error", color: "Error", notes: "Fallo" };
  }
};