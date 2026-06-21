// Copia al portapapeles. En nativo usa @capacitor/clipboard (más fiable en
// WebView); en web usa navigator.clipboard con fallback a execCommand.
// Import ESTÁTICO; seguro en web — nunca lanza.

import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';

export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  // 1) Plugin nativo de Capacitor (Android/iOS).
  if (Capacitor.isNativePlatform()) {
    try {
      await Clipboard.write({ string: text });
      return true;
    } catch {
      /* cae a los fallbacks web */
    }
  }

  // 2) Clipboard API del navegador.
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* cae al fallback execCommand */
  }

  // 3) Fallback para WebViews antiguos sin navigator.clipboard.
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
