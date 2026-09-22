/* =========================================================================
   CONFIG DE FIREBASE
   -------------------------------------------------------------------------
   Se reutiliza el proyecto de LandX (`analisis-de-lotes`): así una cuenta Pro
   sirve igual en LandX y aquí, y el webhook de pago de Wompi que ya existe
   activa el plan sin tocar nada.

   Estos valores son públicos por diseño (la seguridad vive en firestore.rules).
   Mientras digan "PEGA_AQUI", la app corre en MODO DEMO LOCAL (sin cuentas).
   ========================================================================= */
window.firebaseConfig = {
  apiKey: "AIzaSyAr6hy25pEYHj0RUSP8fkCYybIBIeB-Fn4",
  authDomain: "analisis-de-lotes.firebaseapp.com",
  projectId: "analisis-de-lotes",
  storageBucket: "analisis-de-lotes.firebasestorage.app",
  messagingSenderId: "999227291881",
  appId: "1:999227291881:web:3cb15eb38b9294ec9e1878"
};
