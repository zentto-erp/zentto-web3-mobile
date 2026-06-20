import { apiFetch, newIdempotencyKey } from './client';
import type { AccountBalance, CreditInput, Payment, TransferInput } from './types';

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
