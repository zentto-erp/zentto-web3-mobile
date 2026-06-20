import {
  IonContent,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/react';
import {
  swapHorizontalOutline,
  arrowDownOutline,
  arrowUpOutline,
  addCircleOutline,
} from 'ionicons/icons';
import ZenttoHeader from '../components/ZenttoHeader';
import { usePayments } from '../hooks/usePayments';
import { formatAmount, formatDate, paymentStatusMeta } from '../lib/format';
import type { Payment } from '../api/types';

// Tipos que representan entrada de saldo (signo +).
const INFLOW = new Set(['credit', 'deposit', 'receive', 'in']);

function isInflow(p: Payment): boolean {
  return INFLOW.has((p.type || '').toLowerCase());
}

export default function MovementsPage() {
  const payments = usePayments();
  const items = payments.data ?? [];

  return (
    <IonPage>
      <ZenttoHeader title="Movimientos" />
      <IonContent className="zt-page" fullscreen>
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (e) => {
            await payments.refetch();
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        <div className="zt-screen">
          {payments.isLoading && !payments.data ? (
            <div style={{ textAlign: 'center', padding: 28 }}>
              <IonSpinner name="crescent" />
            </div>
          ) : payments.isError ? (
            <div className="zt-empty">
              <IonIcon icon={swapHorizontalOutline} />
              <p>No se pudo cargar el historial. Desliza para reintentar.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="zt-empty">
              <IonIcon icon={swapHorizontalOutline} />
              <p>Aún no tienes movimientos. Recibe o envía saldo para verlos aquí.</p>
            </div>
          ) : (
            <div className="zt-card" style={{ padding: '4px 16px' }}>
              {items.map((p) => (
                <MovementRow key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

function MovementRow({ p }: { p: Payment }) {
  const inflow = isInflow(p);
  const status = paymentStatusMeta(String(p.status));
  const icon =
    (p.type || '').toLowerCase() === 'credit'
      ? addCircleOutline
      : inflow
        ? arrowDownOutline
        : arrowUpOutline;
  const sign = inflow ? '+' : '−';
  const amountColor = inflow ? 'var(--zt-success)' : 'var(--zt-text)';

  const title =
    (p.type || '').toLowerCase() === 'credit'
      ? 'Saldo de prueba'
      : inflow
        ? `Recibido de ${p.counterparty ?? '—'}`
        : `Enviado a ${p.counterparty ?? '—'}`;

  return (
    <div className="zt-row">
      <div className="zt-token">
        <div className="zt-token-badge" style={inflow ? { color: 'var(--zt-success)' } : undefined}>
          <IonIcon icon={icon} />
        </div>
        <div>
          <div>{title}</div>
          <div className="zt-muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{formatDate(p.createdAt)}</span>
            <span className="zt-status-chip" style={{ color: status.color, borderColor: status.color }}>
              {status.label}
            </span>
          </div>
        </div>
      </div>
      <strong style={{ color: amountColor, whiteSpace: 'nowrap' }}>
        {sign}
        {formatAmount(p.amount)} {p.asset}
      </strong>
    </div>
  );
}
