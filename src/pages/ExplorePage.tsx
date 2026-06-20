import { useState } from 'react';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSpinner,
} from '@ionic/react';
import {
  walletOutline,
  searchOutline,
  closeCircleOutline,
  refreshOutline,
  checkmarkCircle,
  closeCircle,
  timeOutline,
  cubeOutline,
} from 'ionicons/icons';
import ZenttoHeader from '../components/ZenttoHeader';
import { useLinkedAddress } from '../hooks/useWallet';
import {
  useEvmAddress,
  useEvmInfo,
  useEvmTx,
  isEvmUnavailable,
  isValidAddress,
  isValidTxHash,
} from '../hooks/useEvm';
import { pickEth, pickUsdc } from '../api/evm';
import { formatAmount, shortenAddress } from '../lib/format';

type Tab = 'address' | 'tx';

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>('address');

  const info = useEvmInfo();
  const evmDown = info.isError && isEvmUnavailable(info.error);

  return (
    <IonPage>
      <ZenttoHeader title="Explorar on-chain" />
      <IonContent className="zt-page" fullscreen>
        <div className="zt-screen">
          <div className="zt-banner" style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.35)', color: '#c7d2fe' }}>
            Vista secundaria de exploración on-chain (Sepolia testnet). Tu saldo real está en
            Inicio (ledger del neobanco).
          </div>

          <div className="zt-card">
            <div className="zt-row" style={{ borderBottom: 'none' }}>
              <span className="zt-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IonIcon icon={cubeOutline} />
                Red
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={`zt-dot${evmDown ? ' off' : ''}`} />
                {evmDown
                  ? 'No disponible'
                  : info.data
                    ? `${(info.data.chainName as string) ?? info.data.network ?? 'Sepolia'}${
                        info.data.blockNumber ? ` · ${info.data.blockNumber}` : ''
                      }`
                    : 'Conectando…'}
              </span>
            </div>
          </div>

          <IonSegment value={tab} onIonChange={(e) => setTab(e.detail.value as Tab)} style={{ marginTop: 14 }}>
            <IonSegmentButton value="address">
              <IonLabel>Address</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="tx">
              <IonLabel>Transacción</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {tab === 'address' ? <AddressExplorer /> : <TxExplorer />}
        </div>
      </IonContent>
    </IonPage>
  );
}

function AddressExplorer() {
  const { address, link, unlink } = useLinkedAddress();
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  const bal = useEvmAddress(address);
  const eth = pickEth(bal.data);
  const usdc = pickUsdc(bal.data);

  function handleLink() {
    if (!isValidAddress(draft)) {
      setDraftError('Address EVM inválida (formato 0x + 40 hex).');
      return;
    }
    setDraftError(null);
    link(draft.trim());
    setDraft('');
  }

  if (!address) {
    return (
      <div className="zt-card">
        <h3>Vincula una address</h3>
        <p className="zt-muted">
          Pega una address EVM (Sepolia) para ver su saldo real de ETH y USDC. Es una address
          pública, no una llave privada, y no se guarda de forma permanente.
        </p>
        <IonItem
          lines="none"
          style={{ '--background': 'var(--zt-card-2)', borderRadius: 12, marginTop: 10 }}
        >
          <IonInput
            value={draft}
            onIonInput={(e) => setDraft(e.detail.value ?? '')}
            placeholder="0x…"
            className="zt-mono"
          />
        </IonItem>
        {draftError && (
          <p className="zt-muted" style={{ color: 'var(--zt-danger)' }}>
            {draftError}
          </p>
        )}
        <IonButton expand="block" style={{ marginTop: 12 }} onClick={handleLink}>
          <IonIcon slot="start" icon={walletOutline} />
          Vincular address
        </IonButton>
      </div>
    );
  }

  return (
    <div className="zt-card">
      <div className="zt-row">
        <div>
          <h3 style={{ margin: 0 }}>Saldo on-chain</h3>
          <div className="zt-muted zt-mono">{shortenAddress(address)}</div>
        </div>
        <IonButton fill="clear" size="small" onClick={() => bal.refetch()}>
          <IonIcon slot="icon-only" icon={refreshOutline} />
        </IonButton>
      </div>

      {bal.isError ? (
        <p className="zt-muted" style={{ color: 'var(--zt-warning)' }}>
          {isEvmUnavailable(bal.error)
            ? 'El endpoint /evm/address no está disponible.'
            : 'No se pudo leer el saldo on-chain.'}
        </p>
      ) : (
        <>
          <div className="zt-row">
            <div className="zt-token">
              <div className="zt-token-badge">$</div>
              <div>
                <div>USDC</div>
                <div className="zt-muted">USD Coin</div>
              </div>
            </div>
            <strong>{bal.isLoading ? '…' : formatAmount(usdc)}</strong>
          </div>
          <div className="zt-row">
            <div className="zt-token">
              <div className="zt-token-badge">Ξ</div>
              <div>
                <div>ETH</div>
                <div className="zt-muted">Sepolia testnet</div>
              </div>
            </div>
            <strong>{bal.isLoading ? '…' : formatAmount(eth, 6)}</strong>
          </div>
        </>
      )}

      <IonButton fill="clear" color="medium" size="small" style={{ marginTop: 6 }} onClick={unlink}>
        <IonIcon slot="start" icon={closeCircleOutline} />
        Desvincular
      </IonButton>
    </div>
  );
}

function TxExplorer() {
  const [hash, setHash] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  const tx = useEvmTx(hash);

  function search() {
    if (!isValidTxHash(draft)) {
      setDraftError('Hash inválido (0x + 64 hex).');
      return;
    }
    setDraftError(null);
    setHash(draft.trim());
  }

  const status = (tx.data?.status ?? '').toLowerCase();
  const statusIcon =
    status === 'success' ? checkmarkCircle : status === 'failed' ? closeCircle : timeOutline;
  const statusColor =
    status === 'success'
      ? 'var(--zt-success)'
      : status === 'failed'
        ? 'var(--zt-danger)'
        : 'var(--zt-warning)';

  return (
    <>
      <IonItem className="zt-card" lines="none">
        <IonInput
          label="Hash de transacción"
          labelPlacement="stacked"
          value={draft}
          onIonInput={(e) => setDraft(e.detail.value ?? '')}
          placeholder="0x…"
          className="zt-mono"
        />
      </IonItem>
      {draftError && (
        <p className="zt-muted" style={{ color: 'var(--zt-danger)', margin: '6px 4px' }}>
          {draftError}
        </p>
      )}

      <IonButton expand="block" style={{ marginTop: 12 }} onClick={search} disabled={!draft}>
        <IonIcon slot="start" icon={searchOutline} />
        Consultar
      </IonButton>

      {hash && (
        <div className="zt-card">
          {tx.isLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <IonSpinner name="crescent" />
            </div>
          ) : tx.isError ? (
            <p className="zt-muted" style={{ color: 'var(--zt-warning)' }}>
              {isEvmUnavailable(tx.error)
                ? 'El endpoint /evm/tx no está disponible.'
                : 'No se pudo consultar la transacción.'}
            </p>
          ) : tx.data ? (
            <>
              <div className="zt-row">
                <span className="zt-muted">Estado</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: statusColor }}>
                  <IonIcon icon={statusIcon} />
                  <strong>{tx.data.status ?? 'pendiente'}</strong>
                </span>
              </div>
              {tx.data.blockNumber != null && (
                <div className="zt-row">
                  <span className="zt-muted">Bloque</span>
                  <span>{tx.data.blockNumber}</span>
                </div>
              )}
              {tx.data.from && (
                <div className="zt-row">
                  <span className="zt-muted">De</span>
                  <span className="zt-mono">{tx.data.from}</span>
                </div>
              )}
              {tx.data.to && (
                <div className="zt-row">
                  <span className="zt-muted">Para</span>
                  <span className="zt-mono">{tx.data.to}</span>
                </div>
              )}
              {tx.data.value != null && (
                <div className="zt-row">
                  <span className="zt-muted">Valor</span>
                  <span>{String(tx.data.value)}</span>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </>
  );
}
