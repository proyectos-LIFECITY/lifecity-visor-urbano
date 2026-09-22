/* =========================================================================
   CONFIGURACIÓN GLOBAL · Visor Urbano Bogotá (Life City)
   -------------------------------------------------------------------------
   Aplica para todos los usuarios y dispositivos. Nada de esto es secreto:
   el link de pago y la URL del Apps Script son públicos por diseño.

   Después de editar: git add -A && git commit && git push
   ========================================================================= */
window.appConfig = {

  // Link de pago de Wompi (plan Pro). Panel de Wompi → Links de pago.
  payUrl: "https://checkout.wompi.co/l/XstZuR",

  // Backend de Apps Script que envía el informe por correo (termina en /exec).
  // Si se deja vacío, el botón simplemente descarga el informe.
  // Código listo para pegar: backend/report-mailer.gs
  reportEndpoint: "",

  // CRM de Life City: cada usuario nuevo entra como lead.
  crmLeadModule: "https://proyectos-lifecity.github.io/crm/lead.js",
  crmProyecto: "Visor Urbano Bogotá"

};
