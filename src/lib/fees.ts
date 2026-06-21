// Cálculo de comisiones para mostrar de forma transparente al usuario.
// El backend SIEMPRE recalcula y cobra; esto es solo display informativo.
import type { FeeRates, Payment } from '../api/types';

/** Comisiones registradas en un movimiento (vienen en `p.metadata`). */
export interface PaymentFeeInfo {
  /** Comisión de plataforma (string decimal). */
  fee?: string;
  /** Comisión de red, solo retiros (string decimal). */
  networkFee?: string;
  /** Comisión total cobrada (string decimal). */
  totalFee?: string;
  /** En depósitos: monto bruto antes de comisión (string decimal). */
  grossAmount?: string;
}

/** Lee un campo string de un objeto metadata de forma defensiva. */
function metaString(meta: Record<string, unknown> | undefined, key: string): string | undefined {
  const v = meta?.[key];
  return typeof v === 'string' && v !== '' ? v : undefined;
}

/** Extrae los campos de comisión de `p.metadata` (acceso defensivo). */
export function feeInfoOf(p: Payment): PaymentFeeInfo {
  const meta = (p as { metadata?: Record<string, unknown> }).metadata;
  return {
    fee: metaString(meta, 'fee'),
    networkFee: metaString(meta, 'networkFee'),
    totalFee: metaString(meta, 'totalFee'),
    grossAmount: metaString(meta, 'grossAmount'),
  };
}

/** ¿El movimiento trae algún dato de comisión para mostrar? */
export function hasFeeInfo(info: PaymentFeeInfo): boolean {
  return !!(info.fee || info.totalFee || info.networkFee || info.grossAmount);
}

/** Desglose de comisión de un retiro on-chain. */
export interface WithdrawFeeBreakdown {
  /** Monto que el usuario envía (lo que recibe la wallet externa). */
  amount: number;
  /** Comisión de la plataforma: max(amount * withdrawPct, minFee). */
  platformFee: number;
  /** Comisión de red (gas) estimada. */
  networkFee: number;
  /** Total a debitar del saldo = amount + platformFee + networkFee. */
  total: number;
}

/**
 * Calcula el desglose de comisión de un retiro a partir de las tarifas vigentes.
 * Si `fees` aún no cargó, las comisiones se asumen 0 (no bloquea el display).
 */
export function calcWithdrawFee(
  amount: number,
  fees: FeeRates | undefined,
): WithdrawFeeBreakdown {
  const amt = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const withdrawPct = fees?.withdrawPct ?? 0;
  const minFee = fees?.minFee ?? 0;
  const networkFee = fees?.withdrawNetworkFee ?? 0;
  const platformFee = amt > 0 ? Math.max(amt * withdrawPct, minFee) : 0;
  const total = amt + platformFee + networkFee;
  return { amount: amt, platformFee, networkFee, total };
}
