import { apiFetch, newIdempotencyKey } from './client';
import type {
  AccountBalance,
  ChainDeposit,
  CreditInput,
  DepositInfo,
  Payment,
  TransferInput,
  WithdrawInput,
} from './types';

// Ledger del neobanco custodial. El "dinero" del usuario vive aquí (no en la cadena).
// Endpoints protegidos (auth por cookies httpOnly + CSRF; mutaciones llevan Idempotency-Key).

/** Saldo real del usuario por asset. */
export async function fetchAccountBalance(): Promise<AccountBalance[]> {
  return apiFetch<AccountBalance[]>('/accounts/balance');
}

/** Historial de movimientos del ledger. */
export async function fetchPayments(): Promise<Payment[]> {
  return apiFetch<Payment[]>('/payments');
}

/** Detalle de un movimiento por id (para la hoja de detalle de transacción). */
export async function fetchPayment(id: string): Promise<Payment> {
  return apiFetch<Payment>(`/payments/${encodeURIComponent(id)}`);
}

/** Transferencia real a otro usuario por email. Mueve saldo en el ledger. */
export async function transfer(input: TransferInput): Promise<Payment> {
  return apiFetch<Payment>('/payments/transfer', {
    method: 'POST',
    body: input,
    idempotencyKey: newIdempotencyKey(),
  });
}

/** Faucet de desarrollo: acredita saldo de prueba a la propia cuenta. */
export async function credit(input: CreditInput): Promise<Payment> {
  return apiFetch<Payment>('/payments/credit', {
    method: 'POST',
    body: input,
    idempotencyKey: newIdempotencyKey(),
  });
}

/** Retiro on-chain a una wallet externa. Requiere TOTP. Idempotente. */
export async function withdraw(input: WithdrawInput): Promise<Payment> {
  return apiFetch<Payment>('/payments/withdraw', {
    method: 'POST',
    body: input,
    idempotencyKey: newIdempotencyKey(),
  });
}

/** Dirección de depósito on-chain del usuario (testnet). */
export async function fetchDepositInfo(): Promise<DepositInfo> {
  return apiFetch<DepositInfo>('/accounts/deposit-address');
}

/** Historial de depósitos detectados on-chain. */
export async function fetchDeposits(): Promise<ChainDeposit[]> {
  return apiFetch<ChainDeposit[]>('/accounts/deposits');
}
