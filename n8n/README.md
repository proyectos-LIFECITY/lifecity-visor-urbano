# Fotos geolocalizadas → Visores LifeCity (n8n)

Dos workflows disponibles:

| Workflow | Canal | Archivo |
|---|---|---|
| Telegram | Bot de Telegram (foto + ubicación) | `telegram_geofotos_workflow.json` |
| WhatsApp | WhatsApp Business Cloud API (foto + ubicación) | `whatsapp_geofotos_workflow.json` |

Ambos exponen un **Webhook GET** con el mismo formato JSON que leen todos los visores (Cali y multi-ciudad `city_viewer.html`).

> 💡 **Alternativa sin n8n:** envía las fotos de WhatsApp a **OpenClaw** (tu agente en AWS) y deja que publique el JSON en S3, en su endpoint HTTP o en `fotos/fotos_whatsapp.json` del repo (instrucciones en `OPENCLAW.md` en la raíz). El visor las carga desde el campo *“URL fotos (S3 / OpenClaw)”*.

## WhatsApp (Cloud API) — resumen
1. Crea una app en [Meta for Developers](https://developers.facebook.com) con el producto **WhatsApp Business**.
2. Importa `whatsapp_geofotos_workflow.json` en n8n y **actívalo**.
3. En Meta → WhatsApp → Configuration → Webhook: usa la URL del nodo *Webhook POST (WhatsApp Cloud API)* (`.../webhook/whatsapp-fotos-in`), suscribe el campo `messages`. La verificación (`hub.challenge`) la responde el nodo GET del mismo path.
4. Variables de entorno en n8n: `WHATSAPP_TOKEN` (token permanente) y `WHATSAPP_PHONE_NUMBER_ID`.
5. El endpoint para el visor es el nodo **Webhook GET /whatsapp-fotos** → pégalo en *Endpoint n8n* del visor.
6. En el chat de WhatsApp del número de la app: envía 📎 → **Ubicación**, luego la **foto**. WhatsApp también elimina el EXIF, por eso son 2 pasos.

---

# Fotos de Telegram geolocalizadas → Visor Cali (n8n)

Envía una **foto** + tu **ubicación** a un bot de Telegram y aparece automáticamente en el mapa 3D, posicionada por las coordenadas del teléfono.

```
Teléfono (Telegram)  ──►  Bot  ──►  n8n (workflow)  ──►  Webhook GET JSON  ──►  Visor (cali_aec_viewer.html)
   foto + ubicación                 getFile + store              [{lat,lon,url,...}]      marcador en el mapa
```

## 1. Crear el bot de Telegram
1. En Telegram habla con **@BotFather** → `/newbot` → nombre y usuario.
2. Copia el **token** (ej. `123456:ABC-DEF...`).

## 2. Importar el workflow en n8n
1. n8n → **Workflows → Import from File** → elige `telegram_geofotos_workflow.json`.
2. Nodo **Telegram Trigger** → crea/asigna una credencial *Telegram API* con tu token.
3. Define el token del bot para el nodo de código, de una de estas formas:
   - **Recomendado:** variable de entorno de n8n `TELEGRAM_BOT_TOKEN=tu_token`.
   - O edita el nodo **Ingesta** y reemplaza `PEGA_TU_TOKEN_AQUI`.
4. **Activa** el workflow (toggle *Active*). Esto habilita el Telegram Trigger y el Webhook.

## 3. Obtener la URL del endpoint
- Abre el nodo **Webhook GET /cali-fotos** y copia la **Production URL**, algo como:
  `https://TU-n8n.tld/webhook/cali-fotos`
- Debe responder un JSON `{ "photos": [ ... ] }` al abrirla en el navegador.

## 4. Conectar el visor
1. Abre `cali_aec_viewer.html`.
2. Sección **“Fotos Telegram · n8n”** → pega la URL del webhook en *Endpoint n8n*.
3. **Conectar y sondear fotos** (sondea cada 15 s). Deja el visor abierto.

## 5. Enviar desde el teléfono
En el chat del bot:
1. 📎 (adjuntar) → **Ubicación** → *Enviar mi ubicación actual*.
2. Envía la **foto** (con o sin descripción).
3. El bot confirma y la foto aparece como marcador en el mapa en sus coordenadas.

> El marcador es un *billboard* con la miniatura; clic en él abre la foto original y muestra lat/lon.

## Notas importantes
- **Por qué ubicación + foto (2 pasos):** Telegram **elimina los metadatos EXIF/GPS** de las fotos comprimidas, así que no se pueden leer las coordenadas de la imagen. Por eso se usa la **ubicación nativa** de Telegram, que sí es fiable y corresponde al GPS del teléfono. El workflow guarda la última ubicación por chat y la asocia a la siguiente foto.
- **Token en la URL de la imagen:** las URLs de archivo de Telegram incluyen el token del bot (`api.telegram.org/file/bot<token>/...`). Es el mecanismo estándar de Telegram; no publiques ese endpoint. Para producción, sube la imagen a tu propio almacenamiento (S3/Cloudinary/Supabase) en un nodo extra y guarda esa URL en `rec.url`.
- **CORS:** el nodo *Responder (CORS)* ya envía `Access-Control-Allow-Origin: *` para que el navegador pueda leerlo.
- **Persistencia:** las fotos se guardan en `staticData` del workflow (hasta 500). Para algo permanente, cambia el almacenamiento a una base de datos / Google Sheets / Supabase y ajusta el nodo *Leer fotos*.

## Formato JSON que espera el visor
Cada elemento admite estas variantes de nombres de campo:
```json
{
  "id": "1234",
  "lat": 3.45123,
  "lon": -76.53210,
  "url": "https://.../foto.jpg",
  "caption": "Fachada norte",
  "date": "2026-07-01T15:04:05Z"
}
```
Acepta también `latitude`/`longitude`, `photo_url`/`image`, y una raíz `{ "photos": [...] }` o un arreglo directo `[...]`.

### Probar sin Telegram
Puedes importar un JSON de ejemplo en el visor: **Importar JSON** en la sección de fotos. Ejemplo:
```json
[
  { "id":"demo1", "lat":3.4577, "lon":-76.5164, "url":"https://picsum.photos/seed/cali1/400", "caption":"Predio Jorge Isaacs" },
  { "id":"demo2", "lat":3.4516, "lon":-76.5320, "url":"https://picsum.photos/seed/cali2/400", "caption":"Centro" }
]
```
O desde la consola del navegador: `CaliViewer.addPhoto({lat:3.4577, lon:-76.5164, url:'https://picsum.photos/seed/x/400', caption:'test'})`.
