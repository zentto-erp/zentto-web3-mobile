import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import {
  paperPlaneOutline,
  qrCodeOutline,
  swapHorizontalOutline,
  addCircleOutline,
  walletOutline,
} from 'ionicons/icons';
import ZenttoHeader from '../components/ZenttoHeader';
import { BalanceSkeleton, ListSkeleton } from '../components/Skeletons';
import { useEvmInfo, isEvmUnavailable } from '../hooks/useEvm';
import { useAccountBalance } from '../hooks/usePayments';
import { useAuth } from '../auth/AuthContext';
import { useCountUp } from '../hooks/useCountUp';
import { formatAmount } from '../lib/format';
import { tapLight } from '../lib/haptics';
import type { AccountBalance } from '../api/types';

// Asset principal mostrado en grande. Si no hay saldo aún, se usa USDT.
const PRIMARY_ASSET = 'USDT';
function assetSymbol(asset: string): string {
  return asset?.toUpperCase() === 'USDC' ? '$' : '₮';
}

export default function HomePage() {
  const history = useHistory();
  const { user } = useAuth();

  const info = useEvmInfo();
  const balance = useAccountBalance();

  const balances: AccountBalance[] = balance.data ?? [];
  const primary =
    balances.find((b) => b.asset?.toUpperCase() === PRIMARY_ASSET) ?? balances[0];
  const others = balances.filter((b) => b !== primary);

  const loadingBalance = balance.isLoading && !balance.data;
  const primaryAmount = Number(primary?.available ?? 0);
  // Count-up del saldo: anima al objetivo cuando ya tenemos datos.
  const animated = useCountUp(primaryAmount, !loadingBalance && !!primary);

  const evmDown = info.isError && isEvmUnavailable(info.error);
  const netLabel = evmDown
    ? 'Red no disponible'
    : info.data
      ? `${(info.data.chainName as string) ?? info.data.network ?? 'Sepolia'}${
          info.data.blockNumber ? ` · bloque ${info.data.blockNumber}` : ''
        }`
      : 'Conectando a la red…';

  function go(path: string) {
    tapLight();
    history.push(path);
  }

  return (
    <IonPage>
      <ZenttoHeader title="Inicio" />
      <IonContent className="zt-page" fullscreen>
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (e) => {
            tapLight();
            await Promise.all([balance.refetch(), info.refetch()]);
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        <div className="zt-screen">
          {/* Tarjeta de cuenta — saldo real del ledger */}
          <div className="zt-balance-card zt-enter">
            <span className="zt-chip-net">
              <span className={`zt-dot${evmDown ? ' off' : ''}`} />
              {netLabel}
            </span>
            <div className="zt-balance-label">
              {primary ? `${primary.asset} disponible` : 'Saldo disponible'}
            </div>
            <div className="zt-balance-amount">
              {loadingBalance ? (
                <BalanceSkeleton />
              ) : primary ? (
                `${assetSymbol(primary.asset)}${formatAmount(animated)}`
              ) : (
                '₮0.00'
              )}
            </div>
            <div className="zt-balance-sub">
              {user?.displayName || user?.email || 'Mi cuenta'}
            </div>

            <div className="zt-quick">
              <button className="zt-quick-item" type="button" onClick={() => go('/send')}>
                <span className="zt-quick-ic">
                  <IonIcon icon={paperPlaneOutline} />
                </span>
                <span className="zt-quick-label">Enviar</span>
              </button>
              <button className="zt-quick-item" type="button" onClick={() => go('/receive')}>
                <span className="zt-quick-ic">
                  <IonIcon icon={qrCodeOutline} />
                </span>
                <span className="zt-quick-label">Recibir</span>
              </button>
              <button className="zt-quick-item" type="button" onClick={() => go('/movements')}>
                <span className="zt-quick-ic">
                  <IonIcon icon={swapHorizontalOutline} />
                </span>
                <span className="zt-quick-label">Historial</span>
              </button>
              <button
                className="zt-quick-item"
                type="button"
                onClick={() => go('/recharge')}
              >
                <span className="zt-quick-ic">
                  <IonIcon icon={addCircleOutline} />
                </span>
                <span className="zt-quick-label">Recargar</span>
              </button>
            </div>
          </div>

          {/* Lista de activos del ledger */}
          <div className="zt-section-head">
            <h3>Mis activos</h3>
            <span className="zt-muted">disponible</span>
          </div>

          {loadingBalance ? (
            <ListSkeleton rows={2} />
          ) : balance.isError ? (
            <div className="zt-card zt-enter">
              <p className="zt-muted" style={{ color: 'var(--zt-danger)', margin: 0 }}>
                No se pudo cargar tu saldo. Desliza hacia abajo para reintentar.
              </p>
            </div>
          ) : balances.length === 0 ? (
            <div className="zt-card zt-enter">
              <div className="zt-empty" style={{ padding: '24px 8px' }}>
                <IonIcon icon={walletOutline} />
                <p>Aún no tienes saldo. Toca "Recargar" para ingresar dinero y empezar.</p>
                <IonButton
                  size="small"
                  fill="outline"
                  style={{ marginTop: 12 }}
                  onClick={() => go('/recharge')}
                >
                  <IonIcon slot="start" icon={addCircleOutline} />
                  Recargar
                </IonButton>
              </div>
            </div>
          ) : (
            <div className="zt-card zt-stagger">
              {primary && <AssetRow b={primary} />}
              {others.map((b) => (
                <AssetRow key={b.asset} b={b} />
              ))}
            </div>
          )}

          {/* Acceso a movimientos */}
          {balances.length > 0 && (
            <IonButton
              expand="block"
              fill="clear"
              style={{ marginTop: 8 }}
              onClick={() => go('/movements')}
            >
              <IonIcon slot="start" icon={swapHorizontalOutline} />
              Ver historial
            </IonButton>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

function AssetRow({ b }: { b: AccountBalance }) {
  const held = Number(b.held);
  return (
    <div className="zt-row">
      <div className="zt-token">
        <div className="zt-token-badge">{assetSymbol(b.asset)}</div>
        <div>
          <div>{b.asset}</div>
          <div className="zt-muted">
            {held > 0 ? `Retenido ${formatAmount(b.held)}` : 'Stablecoin'}
          </div>
        </div>
      </div>
      <strong>{formatAmount(b.available)}</strong>
    </div>
  );
}
