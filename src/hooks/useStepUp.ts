import { useIonAlert } from '@ionic/react';
import { isBiometricAvailable, verifyBiometric } from '../lib/biometric';

/**
 * Step-up de autorización para operaciones sensibles (mover dinero): pide huella
 * (si el dispositivo la tiene) y luego el código de Google Authenticator (2FA),
 * que el backend verifica. Devuelve el código TOTP o null si se cancela.
 *
 * Uso:
 *   const stepUp = useStepUp();
 *   const code = await stepUp('Autoriza la transferencia');
 *   if (!code) return; // cancelado
 *   await mutate({ ...payload, totpCode: code });
 */
export function useStepUp() {
  const [presentAlert] = useIonAlert();

  return async function stepUp(reason = 'Autoriza la operación'): Promise<string | null> {
    // 1) Huella/biometría como gate local (best-effort; no bloquea si no hay).
    try {
      if (await isBiometricAvailable()) {
        const ok = await verifyBiometric(reason);
        if (!ok) return null;
      }
    } catch {
      // si la biometría falla, continuamos al OTP (segundo factor real del backend)
    }

    // 2) Código TOTP (lo exige el backend para autorizar el movimiento).
    return new Promise<string | null>((resolve) => {
      void presentAlert({
        header: 'Verificación 2FA',
        message: 'Ingresa el código de Google Authenticator para autorizar.',
        inputs: [
          {
            name: 'code',
            type: 'tel',
            placeholder: '000000',
            attributes: { inputmode: 'numeric', maxlength: 6 },
          },
        ],
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(null) },
          {
            text: 'Autorizar',
            handler: (data: { code?: string }) => {
              const code = (data?.code ?? '').replace(/\D/g, '').slice(0, 6);
              resolve(code.length === 6 ? code : null);
            },
          },
        ],
      });
    });
  };
}
