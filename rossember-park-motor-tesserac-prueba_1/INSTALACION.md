
# ⚠️ IMPORTANTE: Configuración Inicial del Sistema

Para que el sistema funcione correctamente en producción o en otro computador, debes configurar **LAS LLAVES SECRETAS** en el archivo `.env`.

## 1. Archivo `.env` (Variables de Entorno)

En la raíz del proyecto encontrarás un archivo llamado `.env`. Si no existe, créalo y copia el contenido de abajo.

**NUNCA SUBAS ESTE ARCHIVO A GITHUB PÚBLICO** (Contiene tus claves privadas).

```ini
# Tu clave de Google AI Studio (Para leer placas con IA)
VITE_GEMINI_API_KEY=AIzaSyBfazctvOkyy3q415T2U0l0JLs5-Q3QJ7g

# Tu llave PÚBLICA de Wompi (Para cobrar)
VITE_WOMPI_PUBLIC_KEY=pub_test_XXXXXX

# La URL de tu Webhook en n8n (Para recibir confirmaciones de pago)
VITE_N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/pago-confirmado
```

---

## 2. Configuración de Servicios

### A. Google Gemini (Inteligencia Artificial)
1. Ve a [Google AI Studio](https://aistudio.google.com/).
2. Crea una API KEY nueva.
3. Pégala en `VITE_GEMINI_API_KEY`.

### B. Wompi (Pagos)
1. Ve a tu panel de Wompi -> Desarrolladores.
2. Copia la "Llave Pública".
3. Pégala en `VITE_WOMPI_PUBLIC_KEY`.

### C. n8n (La "Magia" del Backend)
Este sistema está diseñado para delegar la lógica de servidor a n8n.
1. Crea un Workflow en n8n que empiece con un nodo `Webhook`.
2. Ese webhook será llamado por Wompi cuando alguien pague.
3. Copia la URL de ese webhook y pégala en `VITE_N8N_WEBHOOK_URL`.

---

## 3. Guía de Despliegue (Deploy)

Para subir esto a internet (Netlify, Vercel, etc):
1. Al crear el proyecto en la plataforma, busca la sección "Environment Variables".
2. Agrega las mismas 3 variables (`VITE_GEMINI_API_KEY`, etc) con sus valores reales.
3. El sistema las leerá automáticamente.
