# LifeCity · Plataforma Urbana AEC multi-ciudad

Cali · Bogotá · Medellín · Cartagena · Miami Lakes · Boca Ratón · Delray Beach · Quito · Buenos Aires · Madrid

Visores 3D de propiedades y catastro multi-ciudad con estudio de masas tipo Revit (export **IFC**), normativa urbanística por lote, fotos geolocalizadas de WhatsApp (vía **OpenClaw** en AWS, o Telegram/WhatsApp vía n8n) y login.

## Páginas
| Archivo | Qué hace |
|---|---|
| `login.html` | Inicio de sesión / registro (LifeCity). Puerta de entrada a la plataforma. |
| `cali_aec_viewer.html` | Visor Cali: catastro IDESC (WFS), índices POT 2014 (ICB/ICA), OSM, IFC, nubes de puntos, fotos. |
| `city_viewer.html` | **Visor multi-ciudad** con pestañas: `?city=bogota` · `?city=medellin` · `?city=cartagena` · `?city=miamilakes` · `?city=bocaraton` · `?city=delraybeach` · `?city=quito` · `?city=buenosaires` · `?city=madrid`. |
| `masas.html` | Estudio de masas conceptual (tipo Revit): huella del lote, masas, niveles, muros anclados, nube de puntos y **exportación IFC (masas + muros + niveles)**. |
| `auth.js` | Guard de sesión (redirige a `login.html` si no hay sesión). |
| `OPENCLAW.md` | Guía para que **OpenClaw** (agente en AWS) alimente los visores con fotos de WhatsApp geolocalizadas (S3, endpoint HTTP o archivo del repo). |
| `fotos/` | `fotos_whatsapp.json` (fotos que leen los visores) y `fotos/img/` para las imágenes. |
| `n8n/` | Workflows de fotos por **Telegram** y **WhatsApp Cloud API** (ver `n8n/README.md`). |

## Fuentes de datos por ciudad (todas reproyectadas a EPSG:4326 = solape exacto con OSM)
| Ciudad | Lotes / parcelas | Normativa (índices + volumetría) |
|---|---|---|
| Cali | WFS IDESC `catastro:cat_bas_terrenos` | POT 2014: `nur_edificabilidad_icb` (ICB/ICA) + tratamientos |
| Bogotá | **WFS 2.0 IDECA** `catastro/lote` (serviciosgis.catastrobogota.gov.co) | **POT 555/2021 (SDP)**: tratamiento urbanístico, altura máxima, rangos de edificabilidad, antejardines, área de actividad, UPL |
| Medellín | GeoMedellín (ArcGIS REST; URL de capa configurable — el servidor restringe acceso externo por momentos) | POT Acuerdo 48/2014: IC/IO/altura manuales + enlace GeoMedellín |
| Cartagena | MIDAS (URL de capa configurable; Cloudflare limita el acceso externo) | POT Dec. 0977/2001: IC/IO/pisos manuales + enlaces MIDAS/PEMP |
| Miami Lakes | Miami-Dade GIS `MD_Emaps/72` (parcelas + folio + dirección) | Capa *Municipal Zoning* (distrito) + **Municode** (Town of Miami Lakes LDC) con FAR/pisos editables |
| Boca Ratón | Florida Statewide Cadastral (FGIO) | Distritos cap. 28 del Code of Ordinances en **Municode** + FAR/pisos editables |
| Delray Beach | Florida Statewide Cadastral (FGIO) | **Capa Zoning oficial del City GIS** (distrito en el punto) + explorador interactivo de distritos LDR 4.4 con enlace directo a **Municode** y calculadora FAR/pisos/setback |
| Quito | Polígonos de zonificación **PUOS** (copia de referencia) | Decodificación del código PUOS (pisos, COS PB, COS total) + enlace al IRM oficial (PAM) |
| Buenos Aires | Catastro CABA vía **epok/USIG** (parcela por dirección o SMP) | Distrito CPU/CU en el punto (USIG `datos_utiles`) + FOT/pisos editables + enlace al Código Urbanístico |
| Madrid | **WFS INSPIRE CadastralParcel** (D.G. Catastro, oficial) | PGOUM: Norma Zonal manual + enlaces al Visualizador Urbanístico y Sede Catastro por referencia |

## Login (lifecity.com.co)
- **Demo local:** `demo@lifecity.com.co` / `lifecity`. Las cuentas se guardan en el navegador (localStorage) — sirve para demo/piloto en un mismo equipo.
- **Auth real (multi-dispositivo):** en `login.html`, arriba del `<script>`, define:
  ```js
  const SUPABASE_URL = 'https://TU-proyecto.supabase.co';
  const SUPABASE_ANON_KEY = 'TU_ANON_KEY';
  ```
  Con eso `login.html` usa **Supabase Auth** (registro/login/confirmación por correo) sin más cambios. Crea el proyecto gratis en supabase.com → Settings → API para las dos claves.
- El guard (`auth.js`) solo verifica la sesión local que deja el login; funciona igual en ambos modos.

## Desplegar en lifecity.com.co
Son archivos estáticos (HTML/JS). Sube toda la carpeta a tu hosting (o subdominio, p.ej. `app.lifecity.com.co`) y entra por `login.html`. No requiere servidor; solo el navegador consume:
- WFS catastro/POT de la Alcaldía (IDESC), tiles de OpenStreetMap y (opcional) el webhook de n8n para fotos.

## Notas
- Coordenadas en **EPSG:4326 (WGS84)** = coinciden con OpenStreetMap.
- El login local es una **puerta de front-end** (no cifra datos en el servidor). Para producción real usa el modo Supabase.
