import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  useIonToast,
} from '@ionic/react';
import { copyOutline, qrCodeOutline } from 'ionicons/icons';
import ZenttoHeader from '../components/ZenttoHeader';
import QrCode from '../components/QrCode';
import { useLinkedAddress } from '../hooks/useWallet';
import { useAuth } from '../auth/AuthContext';
import { useHistory } from 'react-router-dom';

export default function ReceivePage() {
  const { address } = useLinkedAddress();
  const { user } = useAuth();
  const history = useHistory();
  const [present] = useIonToast();

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      present({ message: `${label} copiado`, duration: 1400, color: 'success' });
    } catch {
      present({ message: 'No se pudo copiar', duration: 1400, color: 'danger' });
    }
  }

  async function copy() {
    if (!address) return;
    await copyText(address, 'Address');
  }

  async function copyEmail() {
    if (!user?.email) return;
    await copyText(user.email, 'Email');
  }

  return (
    <IonPage>
      <ZenttoHeader title="Recibir" />
      <IonContent className="zt-page" fullscreen>
        <div className="zt-screen">
          <div className="zt-banner" style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.35)', color: '#c7d2fe' }}>
            Para recibir saldo de otro usuario de Zentto, comparte tu email: la transferencia
            llega al instante a tu cuenta. La dirección de depósito on-chain por usuario llegará
            en una próxima versión.
          </div>

          {user?.email && (
            <div className="zt-card">
              <h3>Tu email</h3>
              <p className="zt-mono">{user.email}</p>
              <IonButton expand="block" fill="outline" onClick={copyEmail}>
                <IonIcon slot="start" icon={copyOutline} />
                Copiar email
              </IonButton>
            </div>
          )}

          {address ? (
            <>
              <p className="zt-muted" style={{ textAlign: 'center', marginTop: 18 }}>
                QR de tu address EVM vinculada (Sepolia testnet) para recibir ETH / USDC on-chain.
              </p>
              <div className="zt-qr-wrap">
                <QrCode value={address} size={220} />
              </div>
              <div className="zt-card">
                <h3>Tu address on-chain</h3>
                <p className="zt-mono">{address}</p>
                <IonButton expand="block" fill="outline" onClick={copy}>
                  <IonIcon slot="start" icon={copyOutline} />
                  Copiar address
                </IonButton>
              </div>
            </>
          ) : (
            <div className="zt-empty">
              <IonIcon icon={qrCodeOutline} />
              <p>Para recibir on-chain, vincula una address en Explorar.</p>
              <IonButton onClick={() => history.push('/explore')}>Ir a Explorar</IonButton>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
