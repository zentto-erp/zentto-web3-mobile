import { apiFetch, newIdempotencyKey } from './client';
import type {
  AccountBalance,
  ChainDeposit,
  CreditInput,
  DepositInfo,
  FeeRates,
  NetworkInfo,
  Payment,
  SaveWithdrawAddressInput,
  TransferInput,
  WithdrawAddress,
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

/** Redes cripto soportadas (multi-red) para depósito/retiro. */
export async function fetchNetworks(): Promise<NetworkInfo[]> {
  return apiFetch<NetworkInfo[]>('/networks');
}

/** Tarifas de comisión de la plataforma (para mostrar antes de operar). */
export async function fetchFees(): Promise<FeeRates> {
  return apiFetch<FeeRates>('/fees');
}

/** Dirección de depósito on-chain del usuario para una red (default: primaria). */
export async function fetchDepositInfo(network?: string): Promise<DepositInfo> {
  const q = network ? `?network=${encodeURIComponent(network)}` : '';
  return apiFetch<DepositInfo>(`/accounts/deposit-address${q}`);
}

/** Direcciones de retiro guardadas (favoritas). */
export async function fetchWithdrawAddresses(): Promise<WithdrawAddress[]> {
  return apiFetch<WithdrawAddress[]>('/me/withdraw-addresses');
}

/** Guarda una dirección de retiro favorita. */
export async function saveWithdrawAddress(
  input: SaveWithdrawAddressInput,
): Promise<WithdrawAddress> {
  return apiFetch<WithdrawAddress>('/me/withdraw-addresses', { method: 'POST', body: input });
}

/** Elimina una dirección de retiro favorita. */
export async function deleteWithdrawAddress(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/me/withdraw-addresses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/** Historial de depósitos detectados on-chain. */
export async function fetchDeposits(): Promise<ChainDeposit[]> {
  return apiFetch<ChainDeposit[]>('/accounts/deposits');
}
