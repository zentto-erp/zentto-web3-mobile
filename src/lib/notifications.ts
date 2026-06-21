import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Notificaciones LOCALES (no usan Firebase → no rompen el arranque de la APK).
 * Se disparan desde la propia app cuando detecta dinero entrante mientras está
 * abierta. Para push en segundo plano (app cerrada) haría falta FCM + Firebase,
 * que se añade aparte cuando exista el proyecto Firebase.
 */

let granted = false;

/** Pide permiso de notificaciones (Android 13+ lo exige en runtime). Idempotente. */
export async function initNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') {
      granted = true;
      return;
    }
    const req = await LocalNotifications.requestPermissions();
    granted = req.display === 'granted';
  } catch {
    granted = false;
  }
}

/** Lanza una notificación local inmediata. No-op en web o sin permiso. */
export async function localNotify(title: string, body: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || !granted) return;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          // id estable-ish dentro del rango int32 para no colisionar.
          id: Math.floor((Date.now() % 2_000_000_000) + Math.floor(Math.random() * 1000)),
          title,
          body,
          schedule: { at: new Date(Date.now() + 200) },
        },
      ],
    });
  } catch {
    // best-effort: nunca romper el flujo por una notificación
  }
}
