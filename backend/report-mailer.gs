/**
 * Visor Urbano Bogotá (Life City) — envío de informes por correo (Google Apps Script)
 * Recibe {email, filename, subject, body, docBase64, mimeType} y envía el adjunto:
 * el informe .doc o el plano CAD .dxf (mimeType 'application/dxf').
 *
 * Setup (una sola vez):
 *  1) https://script.google.com → Nuevo proyecto → pega este código.
 *  2) Implementar → Nueva implementación → Aplicación web
 *     · Ejecutar como: Yo   · Quién tiene acceso: Cualquier persona
 *  3) Copia la URL /exec y pégala en la app: Ajustes → Configuración avanzada →
 *     "Backend de informes por correo".
 */
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.email && d.docBase64) {
      var blob = Utilities.newBlob(Utilities.base64Decode(d.docBase64), d.mimeType || 'application/msword', d.filename || 'informe.doc');
      MailApp.sendEmail({
        to: d.email,
        subject: d.subject || 'Informe de análisis de tierra',
        body: d.body || 'Adjunto el informe de análisis (formato editable .doc).',
        attachments: [blob]
      });
    }
    return _json({ ok: true });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}
function doGet() { return _json({ ok: true, service: 'Visor Bogota report mailer' }); }
function _json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
