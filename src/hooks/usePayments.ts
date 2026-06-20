import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  credit,
  fetchAccountBalance,
  fetchPayments,
  transfer,
} from '../api/payments';
import type { AccountBalance, CreditInput, Payment, TransferInput } from '../api/types';

const BALANCE_KEY = ['accounts', 'balance'];
const PAYMENTS_KEY = ['payments'];

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
