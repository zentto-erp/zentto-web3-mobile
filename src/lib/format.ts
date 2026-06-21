// Helpers de formato compartidos. Los montos del ledger son strings decimales.

/** Formatea un monto decimal (string|number) con separadores de miles. */
export function formatAmount(v: string | number | null | undefined, maxFrac = 2): string {
  if (v == null || v === '') return '0.00';
  const n = typeof v === 'number' ? v : Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxFrac,
  });
}

/** Acorta una address EVM 0x1234…abcd. */
export function shortenAddress(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

/**
 * Fecha (ISO o epoch) a una sola línea estilo neobanco: "20 jun · 7:43 p. m.".
 * Pensada para `white-space:nowrap` — nunca se parte carácter por carácter.
 */
export function formatDate(value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const day = d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('es', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  // "20 sept" → "20 sep" (mes corto sin punto extra) y une con separador medio.
  return `${day.replace('.', '')} · ${time}`;
}

/**
 * Fecha y hora completa en una sola línea, es-VE: "20 de junio de 2026, 7:43 p. m.".
 * Para el detalle de transacción (más explícito que `formatDate`).
 */
export function formatDateTime(value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const date = d.toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('es-VE', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${date}, ${time}`;
}

/** Formatea un precio en VES (bolívares) con separador de miles. */
export function formatVes(v: string | number | null | undefined): string {
  return `Bs. ${formatAmount(v)}`;
}

/** ¿El string parece un hash/dirección on-chain (0x + hex)? */
export function isHexHash(v: string | null | undefined): boolean {
  return !!v && /^0x[0-9a-fA-F]{40,}$/.test(v.trim());
}

/** Acorta un hash on-chain largo: 0x1234abcd…ef567890. */
export function shortenHash(h: string | null | undefined): string {
  if (!h) return '';
  return h.length > 18 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h;
}

/** Etiqueta legible (es) para el tipo de movimiento del ledger. */
export function paymentTypeLabel(type: string | null | undefined): string {
  switch ((type || '').toLowerCase()) {
    case 'deposit':
      return 'Depósito';
    case 'withdrawal':
    case 'withdraw':
      return 'Retiro';
    case 'transfer':
      return 'Transferencia';
    case 'credit':
      return 'Crédito';
    case 'debit':
      return 'Débito';
    default:
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Movimiento';
  }
}

/** Etiqueta + color para un estado de pago. */
export function paymentStatusMeta(status: string): { label: string; color: string } {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'success' || s === 'confirmed')
    return { label: 'Completado', color: 'var(--zt-success)' };
  if (s === 'failed' || s === 'error' || s === 'rejected')
    return { label: 'Fallido', color: 'var(--zt-danger)' };
  if (s === 'reversed' || s === 'refunded')
    return { label: 'Revertido', color: 'var(--zt-text-dim)' };
  return { label: status || 'Pendiente', color: 'var(--zt-warning)' };
}
