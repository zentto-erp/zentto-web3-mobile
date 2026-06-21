import { useState } from 'react';
import {
  IonContent,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import {
  swapHorizontalOutline,
  arrowDownOutline,
  arrowUpOutline,
  addCircleOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import ZenttoHeader from '../components/ZenttoHeader';
import StatusChip from '../components/StatusChip';
import TransactionDetailModal from '../components/TransactionDetailModal';
import { ListSkeleton } from '../components/Skeletons';
import { usePayments } from '../hooks/usePayments';
import { formatAmount, formatDate } from '../lib/format';
import { feeInfoOf } from '../lib/fees';
import { tapLight } from '../lib/haptics';
import type { Payment } from '../api/types';

// Tipos que representan entrada de saldo (signo +).
const INFLOW = new Set(['credit', 'deposit', 'receive', 'in']);

function isInflow(p: Payment): boolean {
  return INFLOW.has((p.type || '').toLowerCase());
}

export default function MovementsPage() {
  const payments = usePayments();
  const items = payments.data ?? [];
  const [selected, setSelected] = useState<Payment | null>(null);

  return (
    <IonPage>
      <ZenttoHeader title="Historial" />
      <IonContent className="zt-page" fullscreen>
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (e) => {
            tapLight();
            await payments.refetch();
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        <div className="zt-screen">
          {payments.isLoading && !payments.data ? (
            <ListSkeleton rows={6} />
          ) : payments.isError ? (
            <div className="zt-empty zt-enter">
              <IonIcon icon={swapHorizontalOutline} />
              <p>No se pudo cargar el historial. Desliza hacia abajo para reintentar.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="zt-empty zt-enter">
              <IonIcon icon={swapHorizontalOutline} />
              <p>Aún no tienes movimientos. Recibe o envía saldo para verlos aquí.</p>
            </div>
          ) : (
            <div className="zt-card zt-stagger" style={{ padding: '4px 16px' }}>
              {items.map((p) => (
                <MovementRow
                  key={p.id}
                  p={p}
                  onOpen={() => {
                    tapLight();
                    setSelected(p);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </IonContent>

      <TransactionDetailModal payment={selected} onDismiss={() => setSelected(null)} />
    </IonPage>
  );
}

function MovementRow({ p, onOpen }: { p: Payment; onOpen: () => void }) {
  const inflow = isInflow(p);
  const icon =
    (p.type || '').toLowerCase() === 'credit'
      ? addCircleOutline
      : inflow
        ? arrowDownOutline
        : arrowUpOutline;
  const sign = inflow ? '+' : '−';
  const amountColor = inflow ? 'var(--zt-success)' : 'var(--zt-danger)';

  const title =
    (p.type || '').toLowerCase() === 'credit'
      ? 'Saldo de prueba'
      : inflow
        ? `Recibido de ${p.counterparty ?? '—'}`
        : `Enviado a ${p.counterparty ?? '—'}`;

  // Comisión a mostrar discretamente: total cobrado o comisión de plataforma.
  const fees = feeInfoOf(p);
  const feeToShow = fees.totalFee ?? fees.fee;

  return (
    <button type="button" className="zt-tx zt-tx--tap" onClick={onOpen}>
      <div
        className="zt-tx-ic"
        style={inflow ? { color: 'var(--zt-success)', background: 'rgba(52,211,153,0.16)' } : undefined}
      >
        <IonIcon icon={icon} />
      </div>

      <div className="zt-tx-main">
        <div className="zt-tx-title">{title}</div>
        <div className="zt-tx-date">{formatDate(p.createdAt)}</div>
        {feeToShow && (
          <div className="zt-muted" style={{ fontSize: 12, marginTop: 2 }}>
            Comisión: {formatAmount(feeToShow)} {p.asset}
          </div>
        )}
      </div>

      <div className="zt-tx-right">
        <span className="zt-tx-amount" style={{ color: amountColor }}>
          {sign}
          {formatAmount(p.amount)} {p.asset}
        </span>
        <StatusChip status={String(p.status)} />
      </div>

      <IonIcon className="zt-tx-chevron" icon={chevronForwardOutline} aria-hidden="true" />
    </button>
  );
}
