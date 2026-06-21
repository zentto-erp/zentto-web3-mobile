import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelP2pOrder,
  cancelP2pTrade,
  confirmP2pTrade,
  createP2pOrder,
  disputeP2pTrade,
  extendP2pTrade,
  fetchMarketRate,
  fetchMyP2pOrders,
  fetchP2pMessages,
  fetchP2pOrders,
  fetchP2pTrade,
  fetchP2pTrades,
  markP2pTradePaid,
  sendP2pMessage,
  takeP2pOrder,
} from '../api/p2p';
import type {
  CreateP2pOrderInput,
  MarketRate,
  P2pMessage,
  P2pOrder,
  P2pSide,
  P2pTrade,
} from '../api/types';

const ORDERS_KEY = ['p2p', 'orders'];
const MY_ORDERS_KEY = ['p2p', 'orders', 'mine'];
const TRADES_KEY = ['p2p', 'trades'];
const BALANCE_KEY = ['accounts', 'balance'];
const PAYMENTS_KEY = ['payments'];
const MARKET_KEY = ['p2p', 'market'];

/** Order book público: ofertas abiertas filtradas por lado/asset. */
export function useP2pOrders(filter: { side?: P2pSide; asset?: string }) {
  return useQuery<P2pOrder[]>({
    queryKey: [...ORDERS_KEY, filter.side ?? '', filter.asset ?? ''],
    queryFn: () => fetchP2pOrders(filter),
    refetchInterval: 12_000,
    retry: false,
  });
}

export function useMyP2pOrders() {
  return useQuery<P2pOrder[]>({
    queryKey: MY_ORDERS_KEY,
    queryFn: fetchMyP2pOrders,
    refetchInterval: 15_000,
    retry: false,
  });
}

export function useP2pTrades() {
  return useQuery<P2pTrade[]>({
    queryKey: TRADES_KEY,
    queryFn: fetchP2pTrades,
    refetchInterval: 12_000,
    retry: false,
  });
}

/** Detalle de un trade (se refresca para reflejar cambios de estado/escrow). */
export function useP2pTrade(id: string | undefined) {
  return useQuery<P2pTrade>({
    queryKey: [...TRADES_KEY, id],
    queryFn: () => fetchP2pTrade(id as string),
    enabled: !!id,
    refetchInterval: 8_000,
    retry: false,
  });
}

/** Referencia de mercado USDT/VES + banda anti-especulación. */
export function useMarketRate() {
  return useQuery<MarketRate>({
    queryKey: MARKET_KEY,
    queryFn: fetchMarketRate,
    refetchInterval: 60_000,
    staleTime: 60_000,
    retry: false,
  });
}

/** Chat del trade (mensajes + evidencias). Poll corto para sentirse en vivo. */
export function useP2pMessages(id: string | undefined) {
  return useQuery<P2pMessage[]>({
    queryKey: [...TRADES_KEY, id, 'messages'],
    queryFn: () => fetchP2pMessages(id as string),
    enabled: !!id,
    refetchInterval: 5_000,
    retry: false,
  });
}

/** Invalida todo lo que cambia tras operar en P2P (saldo, historial, libro, trades). */
function useInvalidateP2p() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ORDERS_KEY });
    qc.invalidateQueries({ queryKey: MY_ORDERS_KEY });
    qc.invalidateQueries({ queryKey: TRADES_KEY });
    qc.invalidateQueries({ queryKey: BALANCE_KEY });
    qc.invalidateQueries({ queryKey: PAYMENTS_KEY });
  };
}

export function useCreateP2pOrder() {
  const invalidate = useInvalidateP2p();
  return useMutation<P2pOrder, Error, CreateP2pOrderInput>({
    mutationFn: createP2pOrder,
    onSuccess: invalidate,
  });
}

export function useCancelP2pOrder() {
  const invalidate = useInvalidateP2p();
  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: cancelP2pOrder,
    onSuccess: invalidate,
  });
}

export function useTakeP2pOrder() {
  const invalidate = useInvalidateP2p();
  return useMutation<P2pTrade, Error, string>({
    mutationFn: takeP2pOrder,
    onSuccess: invalidate,
  });
}

export function useConfirmP2pTrade() {
  const invalidate = useInvalidateP2p();
  return useMutation<{ ok: boolean }, Error, { id: string; totpCode?: string }>({
    mutationFn: ({ id, totpCode }) => confirmP2pTrade(id, totpCode),
    onSuccess: invalidate,
  });
}

export function useMarkP2pTradePaid() {
  const invalidate = useInvalidateP2p();
  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: markP2pTradePaid,
    onSuccess: invalidate,
  });
}

export function useDisputeP2pTrade() {
  const invalidate = useInvalidateP2p();
  return useMutation<{ ok: boolean }, Error, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) => disputeP2pTrade(id, reason),
    onSuccess: invalidate,
  });
}

export function useExtendP2pTrade() {
  const invalidate = useInvalidateP2p();
  return useMutation<
    { ok: boolean; extensions: number; extensionsLeft: number; deadline: string | null },
    Error,
    string
  >({
    mutationFn: extendP2pTrade,
    onSuccess: invalidate,
  });
}

export function useCancelP2pTrade() {
  const invalidate = useInvalidateP2p();
  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: cancelP2pTrade,
    onSuccess: invalidate,
  });
}

/** Envía mensaje/evidencia y refresca el chat del trade. */
export function useSendP2pMessage(tradeId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<P2pMessage, Error, { body?: string; attachment?: string }>({
    mutationFn: (input) => sendP2pMessage(tradeId as string, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...TRADES_KEY, tradeId, 'messages'] });
    },
  });
}
