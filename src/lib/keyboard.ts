import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

/** Cierra el teclado (en web hace blur del campo activo). */
export function hideKeyboard(): void {
  Keyboard.hide().catch(() => {});
  const el = document.activeElement as HTMLElement | null;
  el?.blur?.();
  (el as any)?.querySelector?.('input,textarea')?.blur?.();
}

/** Comportamiento nativo de teclado en móvil, cubierto de una vez:
 *  1. Enter en cualquier campo (de una línea) cierra el teclado.
 *  2. Al abrir el teclado, el campo enfocado se desplaza a la vista (no queda tapado).
 *  3. Tocar fuera de un input cierra el teclado. */
export function setupMobileKeyboard(): void {
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (!el) return;
      if (el.tagName === 'TEXTAREA' || el.closest?.('ion-textarea')) return;
      if (el.tagName === 'INPUT' || el.tagName === 'ION-INPUT' || el.closest?.('ion-input')) {
        e.preventDefault();
        hideKeyboard();
      }
    },
    true,
  );

  if (!Capacitor.isNativePlatform()) return;

  void Keyboard.addListener('keyboardDidShow', () => {
    const el = document.activeElement as HTMLElement | null;
    setTimeout(() => el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 60);
  });

  document.addEventListener('touchstart', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && !t.closest?.('ion-input, ion-textarea, input, textarea, .zt-chat-input')) {
      Keyboard.hide().catch(() => {});
    }
  });
}
