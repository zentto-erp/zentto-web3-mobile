import { useEffect, useRef } from 'react';
import { usePayments } from './usePayments';
import { initNotifications, localNotify } from '../lib/notifications';
import { formatAmount } from '../lib/format';
import type { Payment } from '../api/types';

const INFLOW = new Set(['receive', 'deposit', 'credit']);

function isIncoming(p: Payment): boolean {
  return INFLOW.has((p.type || '').toLowerCase()) && (p.status ?? 'completed') === 'completed';
}

/**
 * Notifica (localmente) cuando llega dinero a la cuenta mientras la app está
 * abierta: depósitos on-chain, transferencias recibidas y recargas. Compara el
 * historial contra lo ya visto para no repetir ni avisar el histórico al abrir.
 */
export function useIncomingNotifications(): void {
  const payments = usePayments();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    void initNotifications();
  }, []);

  useEffect(() => {
    const list = payments.data;
    if (!list) return;

    // Primera carga: marca todo como visto (no notifica movimientos antiguos).
    if (seen.current === null) {
      seen.current = new Set(list.map((p) => p.id));
      return;
    }

    for (const p of list) {
      if (seen.current.has(p.id)) continue;
      seen.current.add(p.id);
      if (!isIncoming(p)) continue;
      const from = p.counterparty ? ` de ${String(p.counterparty).slice(0, 24)}` : '';
      void localNotify('Recibiste dinero 💸', `+${formatAmount(p.amount)} ${p.asset}${from}`);
    }
  }, [payments.data]);
}
