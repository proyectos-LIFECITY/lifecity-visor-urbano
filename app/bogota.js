/* =========================================================================
   BOGOTÁ · Lote, normativa (POT 555 de 2021) y estudio de mercado
   -------------------------------------------------------------------------
   Fuentes oficiales, todas en EPSG:4326 (coinciden con OpenStreetMap):
     · Lotes        → WFS 2.0 catastro:lote · serviciosgis.catastrobogota.gov.co (IDECA)
     · Normativa    → ArcGIS REST POT555/NORMA_URBANÍSTICA_Y_OT · serviciosg.sdp.gov.co
     · Estrato      → ArcGIS REST ordenamientoterritorial/estratificacion (IDECA)
     · Entorno      → Overpass (OpenStreetMap)

   Este módulo no dibuja nada: entrega datos limpios para la interfaz.
   ========================================================================= */

const WFS_LOTE  = 'https://serviciosgis.catastrobogota.gov.co/arcgis/services/catastro/lote/MapServer/WFSServer';
const REST_LOTE = 'https://serviciosgis.catastrobogota.gov.co/arcgis/rest/services/catastro/lote/MapServer/0';
const POT       = 'https://serviciosg.sdp.gov.co/server/rest/services/POT555/NORMA_URBAN%C3%8DSTICA_Y_OT/MapServer';
const ESTRATO   = 'https://serviciosgis.catastrobogota.gov.co/arcgis/rest/services/ordenamientoterritorial/estratificacion/MapServer/1';

/* Capas del POT que se consultan por punto */
const CAPA = { tratamiento: 2, areaActividad: 9, rangoEdif: 14, upl: 16, antejardin: 20 };

const R = 6378137;
export const BBOX_BOGOTA = { latMin: 3.73, latMax: 4.84, lonMin: -74.45, lonMax: -73.98 };
export const enBogota = (lat, lon) =>
  lat >= BBOX_BOGOTA.latMin && lat <= BBOX_BOGOTA.latMax && lon >= BBOX_BOGOTA.lonMin && lon <= BBOX_BOGOTA.lonMax;

const limpiar = (v) => {
  const s = String(v ?? '').trim();
  return s && s !== 'N/A' && s !== 'No Aplica' && s !== '0' ? s : (s === '0' ? '0' : null);
};

async function json(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  const t = await r.text();
  try { return JSON.parse(t); }
  catch (e) { throw new Error('Respuesta no válida del servicio: ' + t.slice(0, 120)); }
}

/* ============================ GEOMETRÍA ============================ */

/** Área real en m² por fórmula del zapatero sobre proyección local. */
export function areaAnilloM2(anillo, cLat) {
  const k = Math.cos(cLat * Math.PI / 180) * R * Math.PI / 180;
  const p = anillo.map(([lon, lat]) => ({ x: lon * k, y: lat * R * Math.PI / 180 }));
  let a = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += p[j].x * p[i].y - p[i].x * p[j].y;
  return Math.abs(a / 2);
}

export function centroide(anillo) {
  let x = 0, y = 0;
  for (const [lon, lat] of anillo) { x += lon; y += lat; }
  return { lon: x / anillo.length, lat: y / anillo.length };
}

function anilloExterior(geom) {
  if (!geom) return null;
  const polys = geom.type === 'MultiPolygon' ? geom.coordinates
    : (geom.type === 'Polygon' ? [geom.coordinates] : []);
  return polys.length ? polys[0][0] : null;
}

/** Punto dentro de polígono (ray casting). */
function dentro(anillo, lon, lat) {
  let d = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const xi = anillo[i][0], yi = anillo[i][1], xj = anillo[j][0], yj = anillo[j][1];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) d = !d;
  }
  return d;
}

/** Anillo lat/lon → puntos en metros centrados en el centroide (x este, z sur). */
export function huella(anillo) {
  const c = centroide(anillo);
  const kx = 111320 * Math.cos(c.lat * Math.PI / 180), ky = 110540;
  const pts = anillo.map(([lon, lat]) => ({ x: (lon - c.lon) * kx, z: -(lat - c.lat) * ky }));
  // Quita el vértice de cierre repetido
  if (pts.length > 2) {
    const a = pts[0], b = pts[pts.length - 1];
    if (Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.z - b.z) < 1e-6) pts.pop();
  }
  return { pts, centroide: c };
}

/* ============================ 1) EL LOTE ============================ */

/** Lote catastral que contiene el punto (o el más cercano dentro del radio). */
export async function loteEnPunto(lat, lon, radioM = 70) {
  const dLat = radioM / R * 180 / Math.PI;
  const dLon = radioM / (R * Math.cos(lat * Math.PI / 180)) * 180 / Math.PI;
  const url = WFS_LOTE + '?' + new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: 'lote:Lote',
    outputFormat: 'GEOJSON', srsName: 'EPSG:4326', count: '80',
    // El WFS de ArcGIS espera el bbox en orden lat,lon (eje Y primero)
    bbox: `${lat - dLat},${lon - dLon},${lat + dLat},${lon + dLon},EPSG:4326`,
  });
  const d = await json(url);
  const feats = d.features || [];
  if (!feats.length) return null;

  // Primero el lote que realmente contiene el punto; si no, el de centroide más cercano.
  let elegido = feats.find(f => { const a = anilloExterior(f.geometry); return a && dentro(a, lon, lat); });
  if (!elegido) {
    let mejor = Infinity;
    for (const f of feats) {
      const a = anilloExterior(f.geometry); if (!a) continue;
      const c = centroide(a);
      const d2 = (c.lat - lat) ** 2 + (c.lon - lon) ** 2;
      if (d2 < mejor) { mejor = d2; elegido = f; }
    }
  }
  return elegido ? formatearLote(elegido, feats) : null;
}

/** Lote por código catastral (LOTCODIGO = sector + manzana + lote, hasta 12 dígitos). */
export async function lotePorCodigo(codigo) {
  const c = String(codigo).replace(/\s+/g, '');
  if (!/^\d{1,12}$/.test(c)) throw new Error('El código de lote son hasta 12 dígitos (sector + manzana + lote).');
  const where = c.length >= 12 ? `LOTCODIGO='${c}'` : `LOTCODIGO LIKE '${c}%'`;
  const url = REST_LOTE + '/query?' + new URLSearchParams({
    where, outFields: '*', returnGeometry: 'true', outSR: '4326', f: 'geojson', resultRecordCount: '10',
  });
  const d = await json(url);
  if (d.error) throw new Error(d.error.message || 'Error consultando el catastro');
  const f = (d.features || [])[0];
  return f ? formatearLote(f, []) : null;
}

function formatearLote(f, vecinos) {
  const anillo = anilloExterior(f.geometry);
  const p = f.properties || {};
  const c = centroide(anillo);
  return {
    anillo,
    centroide: c,
    area: Math.round(areaAnilloM2(anillo, c.lat)),
    codigo: p.LOTCODIGO || p.Identificador_unico_del_lote || '',
    manzana: p.MANZCODIGO || p.Codigo_Manzana || '',
    unidades: p.LOTUPREDIA || p.Unidad_predial || null,
    // Vecinos para dibujar el contexto de la manzana (sin geometría pesada)
    vecinos: (vecinos || []).map(v => anilloExterior(v.geometry)).filter(Boolean).slice(0, 60),
  };
}

/* ============================ 2) LA NORMATIVA ============================ */

async function capaEnPunto(id, lon, lat) {
  const url = `${POT}/${id}/query?` + new URLSearchParams({
    geometry: `${lon},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects', outFields: '*', returnGeometry: 'false', f: 'json',
  });
  try {
    const d = await json(url);
    return (d.features && d.features[0]) ? d.features[0].attributes : null;
  } catch (e) { return null; }
}

/** Normativa del POT 555 aplicable al punto (centroide del lote). */
export async function normativaEnPunto(lat, lon) {
  const [trat, act, rango, upl, ante] = await Promise.all([
    capaEnPunto(CAPA.tratamiento, lon, lat),
    capaEnPunto(CAPA.areaActividad, lon, lat),
    capaEnPunto(CAPA.rangoEdif, lon, lat),
    capaEnPunto(CAPA.upl, lon, lat),
    capaEnPunto(CAPA.antejardin, lon, lat),
  ]);
  const alturaTxt = trat ? limpiar(trat.ALTURA_MAXIMA) : null;
  const ante0 = ante && ante.DIMENSION !== null && ante.DIMENSION !== undefined && ante.DIMENSION !== ''
    ? Number(ante.DIMENSION) : null;
  return {
    tratamiento: trat ? limpiar(trat.NOMBRE_TRATAMIENTO) : null,
    codigoTratamiento: trat ? limpiar(trat.CODIGO_TRATAMIENTO) : null,
    subtratamiento: trat ? limpiar(trat['CÓDIGO_SUBTRATAMIENTO']) : null,
    tipologia: trat ? limpiar(trat.TIPOLOGIA) : null,
    alturaMaximaTexto: alturaTxt,                 // suele venir vacío → altura "resultante"
    alturaMaximaPisos: alturaTxt ? (parseInt((alturaTxt.match(/\d+/) || [])[0]) || null) : null,
    rango: rango ? limpiar(rango.RANGO) : null,   // 1, 2, 3, 4A..4D
    areaNombre: rango ? limpiar(rango.NOMBRE_AREA) : null,
    areaActividad: act ? limpiar(act.NOMBRE_AREA_ACTIVIDAD) : null,
    upl: upl ? limpiar(upl.NOMBRE) : null,
    uplCodigo: upl ? limpiar(upl.CODIGO_UPL) : null,
    sector: upl ? limpiar(upl.SECTOR) : null,
    antejardinM: Number.isFinite(ante0) ? ante0 : null,
    fuente: 'POT · Decreto 555 de 2021 (SDP)',
  };
}

/* ============ 3) PARÁMETROS DE PARTIDA DE LA MASA ============
   El POT publica por GIS el antejardín y el rango de edificabilidad, pero NO
   los aislamientos laterales/posteriores ni la altura en pisos de cada rango:
   esos están en las tablas del Decreto y dependen del uso y del predio.
   Por eso aquí se entregan valores de PARTIDA, editables con sliders, y cada
   uno indica de dónde salió. El IRM oficial del predio es el que manda.      */

const PISOS_POR_RANGO = { '1': 3, '2': 5, '3': 8, '4A': 12, '4B': 16, '4C': 20, '4D': 24 };

export function parametrosIniciales(norma, areaLote) {
  const pisosNorma = norma.alturaMaximaPisos;
  const pisosRango = norma.rango ? PISOS_POR_RANGO[norma.rango] : null;
  const pisos = pisosNorma || pisosRango || 5;
  const antejardin = norma.antejardinM != null ? norma.antejardinM : 3;

  // En Bogotá el aislamiento posterior aparece casi siempre; el lateral depende
  // de si la tipología es continua (sobre paramento) o aislada.
  const continua = /contin/i.test(norma.tipologia || '') || antejardin === 0;

  return {
    pisos,
    alturaPiso: 3.0,
    antejardin,
    aislPosterior: 3,
    aislLateral: continua ? 0 : 3,
    areaLote,
    origen: {
      pisos: pisosNorma ? 'norma' : (pisosRango ? 'rango ' + norma.rango : 'valor por defecto'),
      antejardin: norma.antejardinM != null ? 'norma' : 'valor por defecto',
      aislPosterior: 'valor por defecto',
      aislLateral: 'valor por defecto',
    },
  };
}

/* ============================ 4) DIRECCIONES ============================ */

export async function buscarDireccion(texto) {
  const q = String(texto || '').trim();
  if (!q) throw new Error('Escribe una dirección');

  // Coordenadas directas: "4.6527, -74.0608"
  const m = q.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  if (m) return [{ nombre: 'Coordenadas ' + q, lat: +m[1], lon: +m[2] }];

  // Código de lote: 9 a 12 dígitos
  if (/^\d{9,12}$/.test(q.replace(/\s+/g, ''))) {
    const lote = await lotePorCodigo(q);
    if (lote) return [{ nombre: 'Lote ' + lote.codigo, lat: lote.centroide.lat, lon: lote.centroide.lon, lote }];
    return [];
  }

  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
    q: q + ', Bogotá, Colombia', format: 'json', limit: '6', countrycodes: 'co',
  });
  const d = await json(url);
  return (Array.isArray(d) ? d : [])
    .map(r => ({ nombre: r.display_name, lat: +r.lat, lon: +r.lon }))
    .filter(r => enBogota(r.lat, r.lon));
}

/* ==================== 5) ESTUDIO DE MERCADO (Pro) ==================== */

const CATEGORIAS = [
  { k: 'transporte', titulo: 'Transporte',  q: '["highway"="bus_stop"];node["railway"="station"];node["amenity"="bus_station"]' },
  { k: 'educacion',  titulo: 'Educación',   q: '["amenity"~"^(school|university|college)$"]' },
  { k: 'salud',      titulo: 'Salud',       q: '["amenity"~"^(hospital|clinic|doctors|pharmacy)$"]' },
  { k: 'comercio',   titulo: 'Comercio',    q: '["shop"~"^(supermarket|mall|convenience)$"]' },
  { k: 'ocio',       titulo: 'Parques y ocio', q: '["leisure"~"^(park|sports_centre|fitness_centre)$"]' },
  { k: 'banca',      titulo: 'Bancos',      q: '["amenity"~"^(bank|atm)$"]' },
];

/** Estrato socioeconómico en el punto (IDECA). */
export async function estratoEnPunto(lat, lon) {
  try {
    const url = ESTRATO + '/query?' + new URLSearchParams({
      geometry: `${lon},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects', outFields: '*', returnGeometry: 'false', f: 'json',
    });
    const d = await json(url);
    const a = (d.features && d.features[0]) ? d.features[0].attributes : null;
    if (!a) return null;
    for (const k of Object.keys(a)) {
      if (/estrato/i.test(k) && a[k] != null && a[k] !== '') return { estrato: a[k], campo: k };
    }
    return null;
  } catch (e) { return null; }
}

/** Entorno urbano en un radio (OpenStreetMap / Overpass). */
export async function entornoEnPunto(lat, lon, radioM = 1000) {
  const partes = CATEGORIAS.map(c => {
    const sel = c.q.split(';').map(s => (s.startsWith('node') || s.startsWith('way') ? s : 'nwr' + s));
    return sel.map(s => `${s}(around:${radioM},${lat},${lon});`).join('');
  }).join('');
  // Ojo: "out center 400" ya trae las etiquetas. Escribir "out center tags 400"
  // hace que Overpass rechace la consulta (responde 504 con una página HTML).
  const query = `[out:json][timeout:30];(${partes});out center 400;`;
  const espejos = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  let d = null, ultimo = '';
  for (const url of espejos) {
    try {
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(query) });
      const t = await r.text();
      if (t.trim().startsWith('{')) { d = JSON.parse(t); break; }
      ultimo = 'el servidor de OpenStreetMap respondió ' + r.status;
    } catch (e) { ultimo = e.message; }
  }
  if (!d) throw new Error('No se pudo consultar el entorno: ' + (ultimo || 'sin respuesta'));
  const conteo = Object.fromEntries(CATEGORIAS.map(c => [c.k, 0]));
  const destacados = [];
  for (const el of (d.elements || [])) {
    const t = el.tags || {};
    let k = null;
    if (t.highway === 'bus_stop' || t.railway === 'station' || t.amenity === 'bus_station') k = 'transporte';
    else if (/^(school|university|college)$/.test(t.amenity || '')) k = 'educacion';
    else if (/^(hospital|clinic|doctors|pharmacy)$/.test(t.amenity || '')) k = 'salud';
    else if (/^(supermarket|mall|convenience)$/.test(t.shop || '')) k = 'comercio';
    else if (/^(park|sports_centre|fitness_centre)$/.test(t.leisure || '')) k = 'ocio';
    else if (/^(bank|atm)$/.test(t.amenity || '')) k = 'banca';
    if (!k) continue;
    conteo[k]++;
    if (t.name && destacados.length < 40) {
      const c = el.center || el;
      destacados.push({ cat: k, nombre: t.name, lat: c.lat, lon: c.lon });
    }
  }
  return {
    radioM,
    categorias: CATEGORIAS.map(c => ({ k: c.k, titulo: c.titulo, n: conteo[c.k] })),
    destacados,
    total: Object.values(conteo).reduce((a, b) => a + b, 0),
  };
}

/** Portales de comparables (precios de venta y arriendo en la zona). */
export function comparables(direccionOUpl) {
  const q = encodeURIComponent((direccionOUpl || 'Bogotá') + ' Bogotá');
  return [
    { nombre: 'Finca Raíz',     url: `https://www.fincaraiz.com.co/buscar?busqueda=${q}` },
    { nombre: 'Metro Cuadrado', url: `https://www.metrocuadrado.com/resultados/?search=${q}` },
    { nombre: 'Properati',      url: `https://www.properati.com.co/s/${q}` },
    { nombre: 'Ciencuadras',    url: `https://www.ciencuadras.com/busqueda?q=${q}` },
  ];
}

/** Estudio de mercado completo — función Pro. */
export async function estudioMercado(lat, lon, contexto = {}) {
  const [estrato, entorno] = await Promise.all([
    estratoEnPunto(lat, lon),
    entornoEnPunto(lat, lon, contexto.radioM || 1000),
  ]);
  return {
    estrato,
    entorno,
    comparables: comparables(contexto.upl || contexto.direccion),
    generado: new Date().toISOString(),
  };
}
