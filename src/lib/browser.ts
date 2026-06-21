// Apertura de enlaces externos (ej. explorer on-chain). En nativo usa el
// in-app browser de Capacitor (@capacitor/browser); en web cae a window.open.
// Import ESTÁTICO; seguro en web — nunca lanza.

import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/** Abre una URL externa. Devuelve true si se pudo abrir. Nunca lanza. */
export async function openExternal(url: string): Promise<boolean> {
  if (!url) return false;
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({ url, presentationStyle: 'popover' });
      return true;
    } catch {
      /* cae al fallback web */
    }
  }
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  } catch {
    return false;
  }
}
