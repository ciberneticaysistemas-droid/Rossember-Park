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

/** URL del Cloudflare Worker proxy (opcional si se usa API Key directa) */
const WORKER_URL = import.meta.env.VITE_GEMINI_WORKER_URL as string;
/** API Key directa (fallback si no hay Worker) */
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

/**
 * Llama al Gemini (vía Worker o Directo) con el modelo y contenidos indicados.
 * Retorna el texto de respuesta de Gemini.
 */
async function callGemini(
  model: string,
  contents: unknown[],
  responseMimeType = "application/json"
): Promise<string> {
  // 1. Intentar vía Worker Proxy si está configurado
  if (WORKER_URL) {
    try {
      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, contents, config: { responseMimeType } }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.text ?? "";
      }
    } catch (e) {
      console.warn("Fallo al contactar el Worker Proxy, intentando directo...", e);
    }
  }

  // 2. Fallback a API Key directa si está configurada
  if (API_KEY) {
    // Usar modelo v1.5 flash ya que el v2.5 no existe comercialmente (o usar el solicitado si es compatible)
    const geminiModel = model.includes("2.5") ? "gemini-1.5-flash" : model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { responseMimeType }
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error ${response.status}: ${JSON.stringify(err)}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  throw new Error("Ni VITE_GEMINI_WORKER_URL ni VITE_GEMINI_API_KEY están configuradas.");
}

// ─────────────────────────────────────────────
// FUNCIÓN 1: Reconocimiento de placa vehicular
// ─────────────────────────────────────────────
export const analyzeImage = async (
  base64Image: string
): Promise<RecognitionResult> => {
  // Verificar que hay alguna forma de llamar a la IA
  if (!WORKER_URL && !API_KEY) {
    console.error("Servicio de IA no configurado en .env");
    alert(
      "⚠️ La Inteligencia Artificial no está configurada.\n" +
      "Por favor configura VITE_GEMINI_API_KEY en el archivo .env."
    );
    return { detected: false, vehicleType: VehicleType.UNKNOWN, plate: "", confidence: 0 };
  }

  // Quitar cabecera base64 si existe (data:image/jpeg;base64,)
  const base64Data = base64Image.includes(",")
    ? base64Image.split(",")[1]
    : base64Image;

  const prompt = `
    INSTRUCCIÓN: Actúa como un experto en visión artificial para control de parqueaderos.
    TU TAREA: Identificar el vehículo y leer la placa en esta imagen.
    
    CONTEXTO (COLOMBIA):
    - Carros: 3 letras y 3 números (Ej: ABC123).
    - Motos: 3 letras, 2 números y 1 letra final (Ej: ABC12D).
    - Colores: Amarilla (servicio particular), Blanca (servicio público).
    
    REGLAS:
    1. Mira detenidamente el área del bumper o la placa de la moto.
    2. Si detectas texto que parece placa, extráelo aunque la imagen no sea perfecta.
    3. Clasifica el tipo de vehículo: "Carro" o "Moto".
    
    RESPUESTA JSON:
    {
      "detected": boolean,
      "vehicleType": "Carro" | "Moto" | "Desconocido",
      "plate": "TEXTO_DE_LA_PLACA",
      "confidence": number (0 a 1)
    }
    Responde SOLO el JSON crudo.
  `;

  try {
    console.log("Analizando imagen con Gemini 1.5 Flash...");

    const text = await callGemini(
      "gemini-1.5-flash",
      [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Data } },
            { text: prompt },
          ],
        },
      ]
    );

    console.log("Respuesta Gemini:", text);
    if (!text) throw new Error("Respuesta de IA vacía.");

    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanText);

    let type = VehicleType.UNKNOWN;
    const vt = (result.vehicleType || "").toLowerCase();
    if (vt.includes("car")) type = VehicleType.CAR;
    if (vt.includes("moto")) type = VehicleType.MOTORCYCLE;

    return {
      detected: result.detected && !!result.plate,
      vehicleType: type,
      plate: (result.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, ""),
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
  if (!WORKER_URL && !API_KEY) {
    return { make: "Error Config", color: "Error", notes: "Falta API Key o Worker" };
  }

  const base64Data = base64Image.includes(",")
    ? base64Image.split(",")[1]
    : base64Image;

  try {
    const text = await callGemini(
      "gemini-1.5-flash",
      [
        {
          role: "user",
          parts: [
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
          ],
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