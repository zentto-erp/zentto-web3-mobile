import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  useIonToast,
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
import { useEvmInfo, isEvmUnavailable } from '../hooks/useEvm';
import { useAccountBalance, useCredit } from '../hooks/usePayments';
import { useAuth } from '../auth/AuthContext';
import { formatAmount } from '../lib/format';
import type { AccountBalance } from '../api/types';

// Asset principal mostrado en grande. Si no hay saldo aún, se usa USDT.
const PRIMARY_ASSET = 'USDT';
const FAUCET_ASSET = 'USDT';
const FAUCET_AMOUNT = '100';

function assetSymbol(asset: string): string {
  return asset?.toUpperCase() === 'USDC' ? '$' : '₮';
}

export default function HomePage() {
  const history = useHistory();
  const { user } = useAuth();
  const [present] = useIonToast();

  const info = useEvmInfo();
  const balance = useAccountBalance();
  const creditMut = useCredit();

  const balances: AccountBalance[] = balance.data ?? [];
  const primary =
    balances.find((b) => b.asset?.toUpperCase() === PRIMARY_ASSET) ?? balances[0];
  const others = balances.filter((b) => b !== primary);

  const evmDown = info.isError && isEvmUnavailable(info.error);
  const netLabel = evmDown
    ? 'Red no disponible'
    : info.data
      ? `${(info.data.chainName as string) ?? info.data.network ?? 'Sepolia'}${
          info.data.blockNumber ? ` · bloque ${info.data.blockNumber}` : ''
        }`
      : 'Conectando a la red…';

  async function handleFaucet() {
    try {
      await creditMut.mutateAsync({ asset: FAUCET_ASSET, amount: FAUCET_AMOUNT });
      present({
        message: `+${FAUCET_AMOUNT} ${FAUCET_ASSET} acreditados`,
        duration: 1600,
        color: 'success',
      });
    } catch {
      present({
        message: 'No se pudo obtener saldo de prueba',
        duration: 1800,
        color: 'danger',
      });
    }
  }

  return (
    <IonPage>
      <ZenttoHeader title="Inicio" />
      <IonContent className="zt-page" fullscreen>
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (e) => {
            await Promise.all([balance.refetch(), info.refetch()]);
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        <div className="zt-screen">
          {/* Tarjeta de cuenta — saldo real del ledger */}
          <div className="zt-balance-card">
            <span className="zt-chip-net">
              <span className={`zt-dot${evmDown ? ' off' : ''}`} />
              {netLabel}
            </span>
            <div className="zt-balance-label">
              {primary ? `${primary.asset} disponible` : 'Saldo disponible'}
            </div>
            <div className="zt-balance-amount">
              {balance.isLoading && !balance.data ? (
                <IonSpinner name="dots" />
              ) : primary ? (
                `${assetSymbol(primary.asset)}${formatAmount(primary.available)}`
              ) : (
                '₮0.00'
              )}
            </div>
            <div className="zt-balance-sub">
              {user?.displayName || user?.email || 'Mi cuenta'}
            </div>

            <div className="zt-actions">
              <IonButton color="light" onClick={() => history.push('/send')}>
                <IonIcon slot="start" icon={paperPlaneOutline} />
                Enviar
              </IonButton>
              <IonButton color="secondary" onClick={() => history.push('/receive')}>
                <IonIcon slot="start" icon={qrCodeOutline} />
                Recibir
              </IonButton>
            </div>
          </div>

          {/* Faucet dev */}
          <IonButton
            expand="block"
            fill="outline"
            style={{ marginTop: 16 }}
            disabled={creditMut.isPending}
            onClick={handleFaucet}
          >
            <IonIcon slot="start" icon={addCircleOutline} />
            {creditMut.isPending ? 'Acreditando…' : `Obtener saldo de prueba (${FAUCET_AMOUNT} ${FAUCET_ASSET})`}
          </IonButton>

          {/* Lista de activos del ledger */}
          <div className="zt-card">
            <div className="zt-row" style={{ borderBottom: 'none', paddingBottom: 4 }}>
              <h3 style={{ margin: 0 }}>Mis activos</h3>
              <span className="zt-muted">disponible</span>
            </div>

            {balance.isError ? (
              <p className="zt-muted" style={{ color: 'var(--zt-danger)' }}>
                No se pudo cargar tu saldo. Desliza para reintentar.
              </p>
            ) : balances.length === 0 ? (
              <div className="zt-empty" style={{ padding: '24px 8px' }}>
                <IonIcon icon={walletOutline} />
                <p>Aún no tienes saldo. Usa el faucet de prueba para empezar.</p>
              </div>
            ) : (
              <>
                {primary && <AssetRow b={primary} />}
                {others.map((b) => (
                  <AssetRow key={b.asset} b={b} />
                ))}
              </>
            )}
          </div>

          {/* Acceso a movimientos */}
          <IonButton
            expand="block"
            fill="clear"
            style={{ marginTop: 8 }}
            onClick={() => history.push('/movements')}
          >
            <IonIcon slot="start" icon={swapHorizontalOutline} />
            Ver movimientos
          </IonButton>
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
