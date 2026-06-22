import { IonIcon, IonModal, useIonToast } from '@ionic/react';
import {
  arrowDownOutline,
  arrowUpOutline,
  addCircleOutline,
  swapHorizontalOutline,
  copyOutline,
  closeOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import StatusChip from './StatusChip';
import { usePayment } from '../hooks/usePayments';
import { formatAmount, formatDateTime, isHexHash, paymentTypeLabel } from '../lib/format';
import { feeInfoOf, hasFeeInfo } from '../lib/fees';
import { copyText } from '../lib/clipboard';
import { tapLight, notifySuccess, notifyError } from '../lib/haptics';
import type { Payment } from '../api/types';

// Tipos que representan entrada de saldo (signo +).
const INFLOW = new Set(['credit', 'deposit', 'receive', 'in']);

function isInflow(p: Payment): boolean {
  return INFLOW.has((p.type || '').toLowerCase());
}

function iconFor(p: Payment) {
  const t = (p.type || '').toLowerCase();
  if (t === 'credit') return addCircleOutline;
  if (t === 'transfer') return swapHorizontalOutline;
  return isInflow(p) ? arrowDownOutline : arrowUpOutline;
}

/** Motivo del fallo si lo hay (failureReason o metadata.failureReason). */
function failureReasonOf(p: Payment): string | null {
  const direct = (p as { failureReason?: unknown }).failureReason;
  if (typeof direct === 'string' && direct) return direct;
  const meta = (p as { metadata?: Record<string, unknown> }).metadata;
  const fromMeta = meta && typeof meta.failureReason === 'string' ? meta.failureReason : null;
  return fromMeta || null;
}

export default function TransactionDetailModal({
  payment,
  onDismiss,
}: {
  /** El item de la lista. null = hoja cerrada. */
  payment: Payment | null;
  onDismiss: () => void;
}) {
  const [present] = useIonToast();
  // Refina con GET /payments/:id mientras la hoja está abierta (sin bloquear el render).
  const detail = usePayment(payment?.id);
  // Fuente de verdad: el detalle del backend si llegó, si no el item de la lista.
  const p: Payment | null = detail.data ?? payment;

  async function copyValue(value: string, label: string) {
    tapLight();
    const ok = await copyText(value);
    if (ok) {
      notifySuccess();
      present({
        message: `${label} copiado`,
        duration: 1400,
        color: 'success',
        cssClass: 'zt-toast',
        position: 'top',
      });
    } else {
      notifyError();
      present({
        message: 'No se pudo copiar',
        duration: 1400,
        color: 'danger',
        cssClass: 'zt-toast',
        position: 'top',
      });
    }
  }

  const inflow = p ? isInflow(p) : false;
  const sign = inflow ? '+' : '−';
  const amountColor = inflow ? 'var(--zt-success)' : 'var(--zt-danger)';
  const failure = p ? failureReasonOf(p) : null;
  const fees = p ? feeInfoOf(p) : null;
  const showFees = !!fees && hasFeeInfo(fees);
  const counterparty = p?.counterparty && !isHexHash(p.counterparty) ? p.counterparty : null;

  return (
    <IonModal
      isOpen={!!payment}
      onDidDismiss={onDismiss}
      className="zt-sheet"
      breakpoints={[0, 0.9]}
      initialBreakpoint={0.9}
      handle
      handleBehavior="cycle"
    >
      {p && (
        <div className="zt-sheet-body">
          {/* Cabecera: ícono grande + tipo + cierre */}
          <div className="zt-sheet-head">
            <button
              type="button"
              className="zt-sheet-close"
              aria-label="Cerrar"
              onClick={() => {
                tapLight();
                onDismiss();
              }}
            >
              <IonIcon icon={closeOutline} />
            </button>

            <div
              className="zt-sheet-ic"
              style={
                inflow
                  ? { color: 'var(--zt-success)', background: 'rgba(52,211,153,0.16)' }
                  : undefined
              }
            >
              <IonIcon icon={iconFor(p)} />
            </div>
            <div className="zt-sheet-type">{paymentTypeLabel(p.type)}</div>
            <StatusChip status={String(p.status)} size="md" />

            <div className="zt-sheet-amount" style={{ color: amountColor }}>
              {sign}
              {formatAmount(p.amount)}
              <span className="zt-sheet-asset">{p.asset}</span>
            </div>
          </div>

          {/* Motivo del fallo (si aplica) */}
          {failure && (
            <div className="zt-sheet-alert">
              <IonIcon icon={alertCircleOutline} />
              <span>{failure}</span>
            </div>
          )}

          {/* Detalle en filas */}
          <div className="zt-sheet-list">
            <div className="zt-detail-row">
              <span className="zt-detail-k">Fecha y hora</span>
              <span className="zt-detail-v">{formatDateTime(p.createdAt)}</span>
            </div>

            {counterparty && (
              <div className="zt-detail-row">
                <span className="zt-detail-k">{inflow ? 'De' : 'Para'}</span>
                <span className="zt-detail-v zt-detail-v--break">{counterparty}</span>
              </div>
            )}

            <div className="zt-detail-row">
              <span className="zt-detail-k">Estado</span>
              <span className="zt-detail-v">
                <StatusChip status={String(p.status)} size="md" />
              </span>
            </div>

            {/* Desglose de comisión (transparencia, estilo Binance) */}
            {showFees && p && fees && (
              <>
                {fees.grossAmount && (
                  <div className="zt-detail-row">
                    <span className="zt-detail-k">Monto bruto</span>
                    <span className="zt-detail-v">
                      {formatAmount(fees.grossAmount)} {p.asset}
                    </span>
                  </div>
                )}
                {fees.fee && (
                  <div className="zt-detail-row">
                    <span className="zt-detail-k">Comisión de plataforma</span>
                    <span className="zt-detail-v">
                      {formatAmount(fees.fee)} {p.asset}
                    </span>
                  </div>
                )}
                {fees.networkFee && (
                  <div className="zt-detail-row">
                    <span className="zt-detail-k">Comisión de red</span>
                    <span className="zt-detail-v">
                      {formatAmount(fees.networkFee)} {p.asset}
                    </span>
                  </div>
                )}
                {fees.totalFee && (
                  <div className="zt-detail-row">
                    <span className="zt-detail-k">Comisión total</span>
                    <span className="zt-detail-v">
                      {formatAmount(fees.totalFee)} {p.asset}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* ID de transacción + copiar (para soporte) */}
            <div className="zt-detail-row">
              <span className="zt-detail-k">ID de transacción</span>
              <button
                type="button"
                className="zt-copy-field"
                onClick={() => copyValue(String(p.id), 'ID')}
                aria-label="Copiar ID de transacción"
              >
                <span className="zt-mono zt-copy-text">{p.id}</span>
                <IonIcon icon={copyOutline} className="zt-copy-ic" />
              </button>
            </div>

            {/* On-chain oculto al usuario: es custodial. El operador ve el hash en
                el backoffice a partir de este ID interno. */}
          </div>

          <p className="zt-sheet-foot">
            Comparte el ID de transacción si necesitas abrir un caso de soporte.
          </p>
        </div>
      )}
    </IonModal>
  );
}
