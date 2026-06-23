import { IonContent, IonIcon, IonPage, useIonToast } from '@ionic/react';
import PageRefresher from '../components/PageRefresher';
import { useHistory } from 'react-router-dom';
import {
  cardOutline,
  chevronForwardOutline,
  logoUsd,
  phonePortraitOutline,
  walletOutline,
  flaskOutline,
} from 'ionicons/icons';
import ZenttoHeader from '../components/ZenttoHeader';
import { useCredit } from '../hooks/usePayments';
import { tapLight, notifySuccess, notifyError } from '../lib/haptics';
import { ApiError } from '../api/client';

/**
 * Recarga REAL: así entra dinero a la app. Cripto (depósito on-chain multi-red),
 * Pago Móvil (compra P2P a operadores verificados, modelo tipo AirTM) y tarjeta
 * internacional (pasarela, próximamente). El faucet de prueba queda solo en dev.
 */
export default function RechargePage() {
  const history = useHistory();
  const [present] = useIonToast();
  const creditMut = useCredit();

  function go(path: string) {
    tapLight();
    history.push(path);
  }

  async function devFaucet() {
    tapLight();
    try {
      await creditMut.mutateAsync({ asset: 'USDT', amount: '100' });
      notifySuccess();
      present({ message: '+100 USDT de prueba acreditados', duration: 1600, color: 'success' });
      history.push('/home');
    } catch (err) {
      notifyError();
      const msg = err instanceof ApiError ? err.message : 'Faucet deshabilitado';
      present({ message: msg, duration: 2000, color: 'danger' });
    }
  }

  return (
    <IonPage>
      <ZenttoHeader title="Recargar" showProfile={false} />
      <IonContent className="zt-page" fullscreen>
        <PageRefresher />
        <div className="zt-screen">
          <p className="zt-muted" style={{ marginTop: 8 }}>
            Elige cómo quieres ingresar dinero a tu cuenta. Tu saldo se mantiene en USDC/USDT
            respaldado, no en activos de dudosa procedencia.
          </p>

          <Method
            icon={walletOutline}
            color="var(--zt-cyan)"
            title="Cripto (USDC/USDT)"
            desc="Deposita desde tu wallet en Ethereum, Polygon o BSC. Se acredita automáticamente."
            badge="Inmediato"
            onClick={() => go('/receive')}
          />

          <Method
            icon={phonePortraitOutline}
            color="var(--zt-success)"
            title="Pago Móvil / Transferencia (Bs.)"
            desc="Compra USDT pagando en bolívares a un operador verificado en el mercado P2P."
            badge="Operadores"
            onClick={() => go('/p2p')}
          />

          <Method
            icon={cardOutline}
            color="var(--zt-text-dim)"
            title="Tarjeta internacional"
            desc="Recarga con tarjeta de crédito/débito vía pasarela de pago."
            badge="Próximamente"
            disabled
          />

          {import.meta.env.DEV && (
            <button
              type="button"
              className="zt-card"
              onClick={devFaucet}
              disabled={creditMut.isPending}
              style={{ width: '100%', textAlign: 'left', border: '1px dashed rgba(255,255,255,0.15)', cursor: 'pointer', marginTop: 16 }}
            >
              <div className="zt-row" style={{ borderBottom: 'none' }}>
                <span className="zt-token" style={{ alignItems: 'center', gap: 8 }}>
                  <IonIcon icon={flaskOutline} style={{ color: 'var(--zt-warning)' }} />
                  <span>
                    <strong style={{ display: 'block' }}>Faucet de prueba (solo dev)</strong>
                    <span className="zt-muted">Acredita 100 USDT ficticios</span>
                  </span>
                </span>
                <IonIcon icon={logoUsd} style={{ color: 'var(--zt-warning)' }} />
              </div>
            </button>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

function Method({
  icon,
  color,
  title,
  desc,
  badge,
  onClick,
  disabled,
}: {
  icon: string;
  color: string;
  title: string;
  desc: string;
  badge: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="zt-card"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        marginTop: 12,
      }}
    >
      <div className="zt-row" style={{ borderBottom: 'none', alignItems: 'flex-start', gap: 10 }}>
        <span
          className="zt-quick-ic"
          style={{ background: 'rgba(255,255,255,0.05)', color, flexShrink: 0 }}
        >
          <IonIcon icon={icon} />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>{title}</strong>
            <span className="zt-status-chip" style={{ color }}>
              {badge}
            </span>
          </span>
          <p className="zt-muted" style={{ margin: '4px 0 0', fontSize: 12.5 }}>
            {desc}
          </p>
        </span>
        {!disabled && (
          <IonIcon icon={chevronForwardOutline} style={{ color: 'var(--zt-text-dim)', flexShrink: 0 }} />
        )}
      </div>
    </button>
  );
}
