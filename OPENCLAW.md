# Guía para OpenClaw (agente en AWS) · Fotos de WhatsApp → Visores LifeCity

Este repositorio es la plataforma LifeCity (visores 3D de Cali, Bogotá, Medellín, Cartagena, Miami Lakes, Boca Ratón, Delray Beach, Quito, Buenos Aires y Madrid). Los visores muestran fotos geolocalizadas como marcadores 3D sobre el mapa y pueden leerlas desde **cualquier URL que devuelva JSON** — ahí es donde entra OpenClaw.

## Cómo se conecta OpenClaw

OpenClaw corre en AWS y recibe las fotos por su canal de WhatsApp. Hay tres formas de "meterse" al visor (de más simple a más integrada):

### Opción A · OpenClaw publica el JSON en S3 (recomendada en AWS)
1. Crea un bucket (o usa el del hosting) con **CORS abierto para GET**:
   ```json
   [{ "AllowedMethods": ["GET"], "AllowedOrigins": ["*"], "AllowedHeaders": ["*"] }]
   ```
2. Instrucción para OpenClaw (pégala en su prompt de sistema / skill):
   > Cuando recibas una foto por WhatsApp: obtén sus coordenadas (EXIF si el archivo llega como documento; si no, pide al remitente la ubicación o la dirección y geocodifícala). Sube la imagen a `s3://TU-BUCKET/lifecity/img/<id>.jpg` (pública o con CloudFront) y actualiza `s3://TU-BUCKET/lifecity/fotos_whatsapp.json` añadiendo una entrada al arreglo, sin borrar las existentes. Valida que el JSON siga siendo un arreglo válido.
3. En el visor, sección **Fotos**: pega `https://TU-BUCKET.s3.amazonaws.com/lifecity/fotos_whatsapp.json` en **“URL fotos (S3 / OpenClaw)”** y activa **“Vigilar cada 20 s”**.

### Opción B · OpenClaw expone un endpoint HTTP
Si OpenClaw tiene un puerto HTTP en tu EC2/Lightsail (o le montas un Lambda + API Gateway), haz que sirva `GET /fotos` devolviendo el mismo JSON (con encabezado `Access-Control-Allow-Origin: *`). Pega esa URL en el campo **“Endpoint (webhook GET → JSON)”** del visor — es el mismo mecanismo que usa n8n.

### Opción C · OpenClaw escribe en el repo desplegado
Si el sitio se sirve desde el propio repo (GitHub Pages / carpeta en el servidor), OpenClaw puede editar directamente `fotos/fotos_whatsapp.json` y subir las imágenes a `fotos/img/`. El visor lo lee con el botón **“Cargar fotos WhatsApp (repo)”**.

## Formato de cada entrada

```json
{
  "id": "wa_2026-07-02_001",
  "lat": 4.65297,
  "lon": -74.06075,
  "url": "https://TU-BUCKET.s3.amazonaws.com/lifecity/img/obra_fachada.jpg",
  "caption": "Fachada norte · avance de obra",
  "date": "2026-07-02T15:30:00Z",
  "city": "bogota",
  "source": "whatsapp"
}
```

- `id` único (el visor deduplica por `id`); `lat`/`lon` en WGS84 (EPSG:4326).
- `url`: absoluta (S3/CloudFront) o relativa al sitio; también acepta data URI para pruebas.
- Raíz del archivo: un arreglo `[...]` o `{ "photos": [...] }` — ambas valen.

## API en el navegador (para pruebas)

- `window.CityViewer.addPhoto({lat, lon, url, caption})` — visor multi-ciudad.
- `window.CaliViewer.addPhoto({...})` — visor de Cali.

## Nota de seguridad

El JSON de fotos es público para quien tenga la URL: no incluyas datos sensibles en los captions y, si el proyecto lo exige, restringe el bucket por CloudFront + dominio del visor en `AllowedOrigins`.
