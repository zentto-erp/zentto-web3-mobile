export interface User {
  id: string;
  email: string;
  displayName?: string | null;
  totpEnabled: boolean;
}

export interface LoginResult {
  mfaRequired: boolean;
  mfaToken?: string;
  user?: User;
}

// ── Ledger del neobanco (saldo y movimientos reales del usuario) ──

/** Saldo del usuario por asset. amount es string decimal. */
export interface AccountBalance {
  asset: string; // USDT, USDC, …
  balance: string; // total
  held: string; // retenido (en tránsito / bloqueos)
  available: string; // disponible para mover
  [k: string]: unknown;
}

export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'reversed'
  | string;

export type PaymentType =
  | 'transfer'
  | 'credit'
  | 'debit'
  | 'deposit'
  | 'withdrawal'
  | string;

/** Un movimiento del ledger. */
export interface Payment {
  id: string;
  type: PaymentType; // transfer, credit, debit, …
  asset: string;
  amount: string; // string decimal
  status: PaymentStatus;
  counterparty?: string | null; // email u otro identificador
  createdAt: number | string; // ISO UTC o epoch
  [k: string]: unknown;
}

export interface TransferInput {
  toEmail: string;
  asset: string;
  amount: string;
}

export interface CreditInput {
  asset: string;
  amount: string;
}

// ── EVM (endpoints públicos que leen Sepolia testnet real) ──
// Nota: el backend desplegado puede no exponerlos todavía (404).
// La app maneja ese caso de forma graceful (ver hooks).

export interface EvmInfo {
  network?: string;
  chainId?: number;
  blockNumber?: number;
  connected?: boolean;
  // Campos defensivos por si el contrato varía:
  [k: string]: unknown;
}

export interface EvmTokenBalance {
  symbol: string;
  balance: string; // formateado en unidades humanas
  decimals?: number;
  raw?: string;
}

export interface EvmAddressBalance {
  address: string;
  // ETH nativo
  eth?: string;
  native?: string;
  // USDC y otros tokens
  usdc?: string;
  tokens?: EvmTokenBalance[];
  [k: string]: unknown;
}

export interface EvmTx {
  hash: string;
  status?: string; // 'success' | 'failed' | 'pending'
  blockNumber?: number | null;
  from?: string;
  to?: string;
  value?: string;
  confirmations?: number;
  found?: boolean;
  [k: string]: unknown;
}
