import { RecognitionResult, VehicleType, VehicleDetails } from "../types";

/**
 * ============================================================
 * Servicio de Gemini — Modo Proxy Seguro (Cloudflare Worker)
 * ============================================================
 * La API Key de Google AI Studio NUNCA se expone en el frontend.
 * Todas las peticiones pasan por el Cloudflare Worker que guarda
 * la clave de forma cifrada (Secret).
 *
 * Para desarrollo local:
 *   VITE_GEMINI_WORKER_URL=http://localhost:8787
 *
 * Para producción (GitHub Pages):
 *   VITE_GEMINI_WORKER_URL=https://rossember-gemini.TU-USER.workers.dev
 * ============================================================
 */

/** URL del Cloudflare Worker proxy (nunca contiene la API Key) */
const WORKER_URL = import.meta.env.VITE_GEMINI_WORKER_URL as string;

/**
 * Llama al Worker proxy con el modelo y contenidos indicados.
 * Retorna el texto de respuesta de Gemini.
 */
async function callGeminiProxy(
  model: string,
  contents: unknown[],
  responseMimeType = "application/json"
): Promise<string> {
  if (!WORKER_URL) {
    throw new Error(
      "VITE_GEMINI_WORKER_URL no configurada en el archivo .env"
    );
  }

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, contents, config: { responseMimeType } }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Worker error ${response.status}: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  return data.text ?? "";
}

// ─────────────────────────────────────────────
// FUNCIÓN 1: Reconocimiento de placa vehicular
// ─────────────────────────────────────────────
export const analyzeImage = async (
  base64Image: string
): Promise<RecognitionResult> => {
  // Verificar que el Worker está configurado
  if (!WORKER_URL) {
    console.error("VITE_GEMINI_WORKER_URL no configurada en .env");
    alert(
      "⚠️ El proxy de IA no está configurado.\n" +
      "Por favor configura VITE_GEMINI_WORKER_URL en el archivo .env y reconstruye."
    );
    return { detected: false, vehicleType: VehicleType.UNKNOWN, plate: "", confidence: 0 };
  }

  // Quitar cabecera base64 si existe (data:image/jpeg;base64,)
  const base64Data = base64Image.includes(",")
    ? base64Image.split(",")[1]
    : base64Image;

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

  try {
    console.log("Enviando imagen al proxy de Gemini...");

    const text = await callGeminiProxy(
      "gemini-2.5-flash",
      [
        { inlineData: { mimeType: "image/jpeg", data: base64Data } },
        { text: prompt },
      ]
    );

    console.log("Respuesta del proxy:", text);
    if (!text) throw new Error("Respuesta vacía del proxy");

    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanText);

    // Mapeo seguro de tipos de vehículo
    let type = VehicleType.UNKNOWN;
    const vt = result.vehicleType?.toLowerCase() ?? "";
    if (vt.includes("car") || vt.includes("carro")) type = VehicleType.CAR;
    if (vt.includes("moto")) type = VehicleType.MOTORCYCLE;

    return {
      detected: result.detected,
      vehicleType: type,
      plate: result.plate || "",
      confidence: result.confidence || 0.8,
    };
  } catch (error) {
    console.error("Error en analyzeImage:", error);
    return {
      detected: false,
      vehicleType: VehicleType.UNKNOWN,
      plate: "",
      confidence: 0,
    };
  }
};

// ─────────────────────────────────────────────
// FUNCIÓN 2: Inspección visual del vehículo
// ─────────────────────────────────────────────
export const inspectVehicle = async (
  base64Image: string
): Promise<VehicleDetails> => {
  if (!WORKER_URL) {
    return { make: "Error Proxy", color: "Error", notes: "Falta VITE_GEMINI_WORKER_URL" };
  }

  const base64Data = base64Image.includes(",")
    ? base64Image.split(",")[1]
    : base64Image;

  try {
    const text = await callGeminiProxy(
      "gemini-2.5-flash",
      [
        { inlineData: { mimeType: "image/jpeg", data: base64Data } },
        {
          text: `
          Analiza visualmente este vehículo para un reporte de auditoría.
          Retorna un JSON con:
          {
            "make": "Marca probable (ej: Mazda, Chevrolet)",
            "color": "Color principal",
            "notes": "Descripción breve (ej: Sedán con vidrios polarizados, golpe en bumper, etc)"
          }
        `,
        },
      ]
    );

    if (!text) return { make: "-", color: "-", notes: "Sin respuesta del proxy" };

    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Error en inspectVehicle:", error);
    return { make: "Error", color: "Error", notes: "Fallo en la inspección visual" };
  }
};