import { useState } from 'react';
import PageRefresher from '../components/PageRefresher';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonPage,
  useIonToast,
} from '@ionic/react';
import {
  shieldCheckmarkOutline,
  shieldOutline,
  copyOutline,
  qrCodeOutline,
} from 'ionicons/icons';
import ZenttoHeader from '../components/ZenttoHeader';
import { useSetupTotp, useEnableTotp } from '../hooks/useSecurity';
import { useAuth } from '../auth/AuthContext';
import { tapLight, notifySuccess, notifyError } from '../lib/haptics';
import { ApiError } from '../api/client';
import type { TotpSetup } from '../api/types';

const CODE_RE = /^\d{6}$/;

export default function SecurityPage() {
  const [present] = useIonToast();
  const { user, refreshMe } = useAuth();
  const setupMut = useSetupTotp();
  const enableMut = useEnableTotp();

  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState('');

  const enabled = !!user?.totpEnabled;
  const validCode = CODE_RE.test(code.trim());

  async function startSetup() {
    try {
      const res = await setupMut.mutateAsync();
      setSetup(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo iniciar la configuración 2FA';
      present({ message: msg, duration: 2400, color: 'danger' });
    }
  }

  async function confirmEnable() {
    if (!validCode) return;
    tapLight();
    try {
      await enableMut.mutateAsync(code.trim());
      notifySuccess();
      present({ message: '2FA activado', duration: 1800, color: 'success' });
      setSetup(null);
      setCode('');
      await refreshMe();
    } catch (err) {
      notifyError();
      const msg = err instanceof ApiError ? err.message : 'Código inválido';
      present({ message: msg, duration: 2200, color: 'danger' });
    }
  }

  async function copySecret() {
    if (!setup?.secret) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      present({ message: 'Clave copiada', duration: 1400, color: 'success' });
    } catch {
      present({ message: 'No se pudo copiar', duration: 1400, color: 'danger' });
    }
  }

  return (
    <IonPage>
      <ZenttoHeader title="Seguridad · 2FA" />
      <IonContent className="zt-page" fullscreen>
        <PageRefresher />
        <div className="zt-screen">
          <div className="zt-card" style={{ marginTop: 8 }}>
            <div className="zt-row" style={{ borderBottom: 'none' }}>
              <span className="zt-token">
                <IonIcon
                  icon={enabled ? shieldCheckmarkOutline : shieldOutline}
                  style={{ color: enabled ? 'var(--zt-success)' : 'var(--zt-text-dim)' }}
                />
                <span>Verificación en dos pasos</span>
              </span>
              <span style={{ color: enabled ? 'var(--zt-success)' : 'var(--zt-text-dim)' }}>
                {enabled ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <p className="zt-muted" style={{ margin: '6px 0 0' }}>
              El 2FA con Google Authenticator es obligatorio para retirar a wallets externas.
            </p>
          </div>

          {enabled ? (
            <div className="zt-banner" style={{ background: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.35)', color: '#a7f3d0' }}>
              Tu cuenta ya tiene 2FA activo. Usa los códigos de Google Authenticator al retirar.
            </div>
          ) : !setup ? (
            <>
              <p className="zt-muted" style={{ marginTop: 16 }}>
                Instala Google Authenticator (o similar) y pulsa el botón para generar el código QR
                que vincula tu cuenta.
              </p>
              <IonButton
                expand="block"
                style={{ marginTop: 10 }}
                disabled={setupMut.isPending}
                onClick={startSetup}
              >
                <IonIcon slot="start" icon={qrCodeOutline} />
                {setupMut.isPending ? 'Generando…' : 'Configurar 2FA'}
              </IonButton>
            </>
          ) : (
            <>
              <p className="zt-muted" style={{ marginTop: 16, textAlign: 'center' }}>
                Escanea este QR con Google Authenticator.
              </p>
              <div className="zt-qr-wrap">
                <img src={setup.qrDataUrl} alt="QR 2FA" width={220} height={220} />
              </div>

              <div className="zt-card">
                <h3>Clave manual</h3>
                <p className="zt-mono">{setup.secret}</p>
                <IonButton expand="block" fill="outline" onClick={copySecret}>
                  <IonIcon slot="start" icon={copyOutline} />
                  Copiar clave
                </IonButton>
              </div>

              <IonItem className="zt-card" lines="none" style={{ marginTop: 12 }}>
                <IonInput
                  label="Código de 6 dígitos"
                  labelPlacement="stacked"
                  type="number"
                  inputmode="numeric"
                  maxlength={6}
                  value={code}
                  onIonInput={(e) => setCode((e.detail.value ?? '').replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                />
              </IonItem>

              <IonButton
                expand="block"
                style={{ marginTop: 14 }}
                disabled={!validCode || enableMut.isPending}
                onClick={confirmEnable}
              >
                <IonIcon slot="start" icon={shieldCheckmarkOutline} />
                {enableMut.isPending ? 'Activando…' : 'Activar 2FA'}
              </IonButton>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
