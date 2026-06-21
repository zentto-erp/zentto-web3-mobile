import { paymentStatusMeta } from '../lib/format';

/**
 * Chip de estado fino y consistente para toda la app (estilo Binance/Meru).
 * El color sale de `paymentStatusMeta`; el fondo/borde atenuado lo aporta
 * `.zt-status-chip` en el CSS (color-mix con fallback).
 *
 * Variante `size="sm"` para listas; `size="md"` para el detalle.
 */
export default function StatusChip({
  status,
  size = 'sm',
}: {
  status: string;
  size?: 'sm' | 'md';
}) {
  const meta = paymentStatusMeta(String(status));
  return (
    <span
      className={`zt-status-chip${size === 'md' ? ' zt-status-chip--md' : ''}`}
      style={{ color: meta.color }}
    >
      {meta.label}
    </span>
  );
}
