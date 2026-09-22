# Visor Urbano Bogotá · Life City

Landing + herramienta web para evaluar un lote de Bogotá: **encuentra el predio, lee su norma del POT, modela la masa en 3D y recibe el informe por correo**. El estudio de mercado es la función del plan Pro.

Publicado en **https://proyectos-lifecity.github.io/lifecity-visor-urbano/**

## El recorrido

| Paso | Qué hace | Fuente |
|---|---|---|
| **Landing** (`index.html`) | Explica la herramienta a un interesado y lo lleva al botón *Abrir la herramienta*. Incluye formulario de contacto que entra al CRM. | — |
| **Cuenta** (`app/index.html`) | Login con **Firebase** (correo/contraseña o Google). Al crear la cuenta, el usuario **entra como lead al CRM de Life City**. | `crm/lead.js` |
| **1 · Lote** | Toca el mapa, busca por dirección o código, usa tu GPS, o **toma una foto**: si trae GPS EXIF se ubica sola. | WFS `catastro:lote` (IDECA) |
| **2 · Normativa** | Tratamiento, tipología, altura máxima, rango de edificabilidad, antejardín, área de actividad y UPL. | POT · Decreto 555 de 2021 (SDP) |
| **3 · Masa 3D** | Volumen con **antejardín, aislamiento lateral y posterior** y altura por pisos, precargados desde la norma y editables con sliders. | three.js |
| **4 · Informe** | Documento editable con lote, norma, masa y cifras, enviado **al correo de la cuenta**. | Apps Script |
| **4 · Mercado** ⭐ | Estrato, entorno a 1 km por categorías y portales de comparables. **Función Pro.** | IDECA + OpenStreetMap |

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | Landing para interesados, con CTA a la herramienta y formulario que escribe en el CRM. |
| `app/index.html` | La herramienta: login, mapa, normativa, masa 3D, mercado e informe. |
| `app/bogota.js` | Lote, normativa del POT, parámetros iniciales de la masa y estudio de mercado. |
| `firebase-config.js` | Proyecto Firebase (se reutiliza el de LandX: una cuenta Pro sirve en ambas apps). |
| `app-config.js` | Link de pago Wompi, endpoint de informes y módulo del CRM. |
| `firestore.rules` | Nadie puede autoasignarse el plan Pro; cada quien solo ve lo suyo. |
| `backend/report-mailer.gs` | Apps Script que envía el informe por correo. |

Los visores anteriores (`city_viewer.html` multi-ciudad, `cali_aec_viewer.html`, `masas.html`) siguen en el repo y funcionan por su propia URL, con el login antiguo de `auth.js`.

## Cómo funciona por dentro

- **Todo en EPSG:4326**, igual que OpenStreetMap: el lote calza exacto sobre el mapa.
- **Retrocesos por orientación, no por índice de lado.** El catastro densifica los linderos en decenas de segmentos diminutos (un lote típico trae 64 vértices, varios de 6 cm). Por eso la masa agrupa los lados por su normal: los que miran al frente reciben el antejardín, los opuestos el aislamiento posterior y el resto el lateral. El botón **↻ Girar frente** recorre solo los lados reales.
- **Honestidad sobre el origen del dato.** El POT publica por GIS el antejardín y el rango de edificabilidad; las alturas por rango y los aislamientos laterales/posteriores están en las tablas del Decreto y dependen del uso. La app marca cada valor como *norma* o *valor por defecto*, y repite que **el IRM oficial del predio es el que manda**.
- **El plan Pro no se puede falsificar desde el cliente**: las reglas de Firestore impiden escribir `plan`, que solo cambia el webhook de pago.

## Configuración pendiente

1. **Informe por correo**: crear el Apps Script con `backend/report-mailer.gs`, implementarlo como aplicación web («Ejecutar como: Yo», «Cualquier persona») y pegar la URL `/exec` en `app-config.js` → `reportEndpoint`. Mientras esté vacío, el botón descarga el informe en vez de enviarlo.
2. **Reglas de Firestore**: publicar `firestore.rules` en el proyecto `analisis-de-lotes`.
3. **Dominio**: si se quiere `bogota.lifecity.com.co`, añadir el CNAME y configurarlo en Settings → Pages.

## Desarrollo

```bash
python -m http.server 8790
```

Abre `http://localhost:8790`. Para probar la herramienta **sin crear cuentas reales ni leads**, usa `http://localhost:8790/app/?demo=1`: fuerza el modo local (todo queda en el navegador).
