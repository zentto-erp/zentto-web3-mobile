// Push notifications — DESHABILITADO temporalmente.
//
// @capacitor/push-notifications arrastra `firebase-messaging`, cuyo
// `FirebaseInitProvider` se ejecuta al ARRANCAR la app y CRASHEA de forma nativa
// si no existe `google-services.json` (antes de que corra cualquier try/catch de
// JS). Para no romper el arranque, dejamos un stub no-op.
//
// PARA REACTIVAR push:
//   1) Crear proyecto Firebase, descargar `google-services.json` → android/app/.
//   2) Reinstalar `@capacitor/push-notifications` y restaurar este archivo.
//   3) Añadir un endpoint backend para registrar el device token.

export async function registerForPush(): Promise<void> {
  // no-op hasta configurar Firebase (ver nota arriba).
}
