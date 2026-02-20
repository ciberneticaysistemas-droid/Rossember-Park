/**
 * ============================================================
 * ROSSEMBER PARK - Cloudflare Worker (Proxy Seguro para Gemini)
 * ============================================================
 * 
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. Ve a https://workers.cloudflare.com/ y crea una cuenta gratuita
 * 2. Crea un nuevo Worker y pega este código
 * 3. En el Worker, ve a Settings > Variables > añade:
 *    - Variable name: GEMINI_API_KEY
 *    - Value: tu clave de Google AI Studio
 *    - Marca "Encrypt" para que sea un Secret
 * 4. Despliega el Worker y copia la URL (ej: https://rossember-gemini.TU-USER.workers.dev)
 * 5. Actualiza VITE_GEMINI_WORKER_URL en tu .env con esa URL
 * 
 * CORS: Solo permite peticiones desde tu dominio de GitHub Pages
 * ============================================================
 */

// ⚠️ CAMBIA ESTO por tu dominio real de GitHub Pages
const ALLOWED_ORIGINS = [
    "https://ciberneticaysistemas-droid.github.io",
    "http://localhost:5173",   // Para desarrollo local
    "http://localhost:4173",   // Para preview local
];

export default {
    async fetch(request, env) {
        const origin = request.headers.get("Origin") || "";

        // --- Manejo de preflight CORS ---
        if (request.method === "OPTIONS") {
            return handleCORS(origin);
        }

        // --- Validar origen permitido ---
        if (!ALLOWED_ORIGINS.includes(origin)) {
            return new Response(
                JSON.stringify({ error: "Acceso no autorizado" }),
                {
                    status: 403,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // --- Solo aceptar POST ---
        if (request.method !== "POST") {
            return new Response(
                JSON.stringify({ error: "Método no permitido" }),
                { status: 405, headers: { "Content-Type": "application/json" } }
            );
        }

        // --- Leer el body de la petición del frontend ---
        let body;
        try {
            body = await request.json();
        } catch {
            return new Response(
                JSON.stringify({ error: "Body JSON inválido" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const { model, contents, config } = body;

        // --- Validar campos requeridos ---
        if (!model || !contents) {
            return new Response(
                JSON.stringify({ error: "Faltan campos: model y contents" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // --- Llamar a la API de Gemini con la KEY guardada en el Worker ---
        const GEMINI_API_KEY = env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return new Response(
                JSON.stringify({ error: "API Key no configurada en el Worker" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

        // Construir el body para la API de Gemini REST
        const geminiBody = {
            contents: contents.map((item) => ({
                parts: Array.isArray(item)
                    ? item
                    : [item], // Soporta ambos formatos
            })),
            ...(config?.responseMimeType && {
                generationConfig: {
                    responseMimeType: config.responseMimeType,
                },
            }),
        };

        try {
            const geminiResponse = await fetch(geminiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(geminiBody),
            });

            const geminiData = await geminiResponse.json();

            if (!geminiResponse.ok) {
                return new Response(
                    JSON.stringify({ error: "Error de Gemini API", details: geminiData }),
                    {
                        status: geminiResponse.status,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": origin,
                        },
                    }
                );
            }

            // Extraer el texto de la respuesta de Gemini
            const text =
                geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

            return new Response(
                JSON.stringify({ text }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": origin,
                    },
                }
            );
        } catch (error) {
            return new Response(
                JSON.stringify({ error: "Error interno del proxy", details: String(error) }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": origin,
                    },
                }
            );
        }
    },
};

/** Responde a las peticiones preflight de CORS */
function handleCORS(origin) {
    const isAllowed = ALLOWED_ORIGINS.includes(origin);
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": isAllowed ? origin : "null",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
        },
    });
}
