import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  credit,
  deleteWithdrawAddress,
  fetchAccountBalance,
  fetchDepositInfo,
  fetchDeposits,
  fetchFees,
  fetchNetworks,
  fetchPayment,
  fetchPayments,
  fetchWithdrawAddresses,
  saveWithdrawAddress,
  transfer,
  withdraw,
} from '../api/payments';
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
} from '../api/types';

const BALANCE_KEY = ['accounts', 'balance'];
const PAYMENTS_KEY = ['payments'];
const DEPOSIT_INFO_KEY = ['accounts', 'deposit-address'];
const DEPOSITS_KEY = ['accounts', 'deposits'];
const NETWORKS_KEY = ['networks'];
const WITHDRAW_ADDRESSES_KEY = ['me', 'withdraw-addresses'];

/** Saldo real del usuario (ledger). Se refresca solo cada 15s. */
export function useAccountBalance() {
  return useQuery<AccountBalance[]>({
    queryKey: BALANCE_KEY,
    queryFn: fetchAccountBalance,
    refetchInterval: 15_000,
    retry: false,
  });
}

/** Historial de movimientos del ledger. */
export function usePayments() {
  return useQuery<Payment[]>({
    queryKey: PAYMENTS_KEY,
    queryFn: fetchPayments,
    refetchInterval: 15_000,
    retry: false,
  });
}

/**
 * Detalle de un movimiento por id. Solo corre cuando `id` está presente
 * (la hoja de detalle está abierta). Hidrata con el item de la lista si lo hay.
 */
export function usePayment(id: string | null | undefined) {
  return useQuery<Payment>({
    queryKey: ['payments', 'detail', id],
    queryFn: () => fetchPayment(id as string),
    enabled: !!id,
    retry: false,
    staleTime: 30_000,
  });
}

/** Invalida saldo + historial tras una operación bancaria. */
function useInvalidateBanca() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: BALANCE_KEY });
    qc.invalidateQueries({ queryKey: PAYMENTS_KEY });
  };
}

/** Transferencia a otro usuario por email. */
export function useTransfer() {
  const invalidate = useInvalidateBanca();
  return useMutation<Payment, Error, TransferInput>({
    mutationFn: transfer,
    onSuccess: invalidate,
  });
}

/** Faucet de desarrollo (obtener saldo de prueba). */
export function useCredit() {
  const invalidate = useInvalidateBanca();
  return useMutation<Payment, Error, CreditInput>({
    mutationFn: credit,
    onSuccess: invalidate,
  });
}

/** Tarifas de comisión de la plataforma (transparencia). Cache larga. */
export function useFees() {
  return useQuery<FeeRates>({
    queryKey: ['fees'],
    queryFn: fetchFees,
    staleTime: 10 * 60_000,
    retry: false,
  });
}

/** Redes cripto soportadas (multi-red). Estable; cache larga. */
export function useNetworks() {
  return useQuery<NetworkInfo[]>({
    queryKey: NETWORKS_KEY,
    queryFn: fetchNetworks,
    staleTime: 10 * 60_000,
    retry: false,
  });
}

/** Dirección de depósito on-chain para una red (default: primaria). */
export function useDepositInfo(network?: string) {
  return useQuery<DepositInfo>({
    queryKey: [...DEPOSIT_INFO_KEY, network ?? ''],
    queryFn: () => fetchDepositInfo(network),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Direcciones de retiro guardadas (favoritas). */
export function useWithdrawAddresses() {
  return useQuery<WithdrawAddress[]>({
    queryKey: WITHDRAW_ADDRESSES_KEY,
    queryFn: fetchWithdrawAddresses,
    staleTime: 60_000,
    retry: false,
  });
}

export function useSaveWithdrawAddress() {
  const qc = useQueryClient();
  return useMutation<WithdrawAddress, Error, SaveWithdrawAddressInput>({
    mutationFn: saveWithdrawAddress,
    onSuccess: () => qc.invalidateQueries({ queryKey: WITHDRAW_ADDRESSES_KEY }),
  });
}

export function useDeleteWithdrawAddress() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: deleteWithdrawAddress,
    onSuccess: () => qc.invalidateQueries({ queryKey: WITHDRAW_ADDRESSES_KEY }),
  });
}

/** Historial de depósitos detectados on-chain. */
export function useDeposits() {
  return useQuery<ChainDeposit[]>({
    queryKey: DEPOSITS_KEY,
    queryFn: fetchDeposits,
    refetchInterval: 20_000,
    retry: false,
  });
}

/** Retiro on-chain a wallet externa (requiere TOTP). */
export function useWithdraw() {
  const invalidate = useInvalidateBanca();
  const qc = useQueryClient();
  return useMutation<Payment, Error, WithdrawInput>({
    mutationFn: withdraw,
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: DEPOSITS_KEY });
      qc.invalidateQueries({ queryKey: WITHDRAW_ADDRESSES_KEY });
    },
  });
}
