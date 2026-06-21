import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  useIonToast,
} from '@ionic/react';
import {
  addCircleOutline,
  swapHorizontalOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
  chatbubbleEllipsesOutline,
  storefrontOutline,
  timeOutline,
} from 'ionicons/icons';
import ZenttoHeader from '../components/ZenttoHeader';
import PublishOfferModal from '../components/PublishOfferModal';
import { CardSkeleton } from '../components/Skeletons';
import {
  useCancelP2pOrder,
  useCancelP2pTrade,
  useConfirmP2pTrade,
  useMyP2pOrders,
  useP2pOrders,
  useP2pTrades,
  useTakeP2pOrder,
} from '../hooks/useP2p';
import { useStepUp } from '../hooks/useStepUp';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { formatAmount, formatDate, formatVes, shortenAddress } from '../lib/format';
import { tapLight, selection, notifySuccess, notifyError } from '../lib/haptics';
import type { P2pOrder, P2pSide, P2pTrade } from '../api/types';

type Tab = 'book' | 'mine' | 'trades';

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: 'Abierta', color: 'var(--zt-success)' },
  taken: { label: 'Tomada', color: 'var(--zt-warning)' },
  cancelled: { label: 'Cancelada', color: 'var(--zt-text-dim)' },
};

const TRADE_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Esperando pago', color: 'var(--zt-warning)' },
  paid: { label: 'Pago marcado', color: 'var(--zt-cyan)' },
  completed: { label: 'Completado', color: 'var(--zt-success)' },
  cancelled: { label: 'Cancelado', color: 'var(--zt-text-dim)' },
  disputed: { label: 'En disputa', color: 'var(--zt-danger)' },
  expired: { label: 'Expirado', color: 'var(--zt-text-dim)' },
};

export default function P2pPage() {
  const [present] = useIonToast();
  const { user } = useAuth();
  const history = useHistory();
  const stepUp = useStepUp();

  const [tab, setTab] = useState<Tab>('book');
  // En el libro elijo qué quiero hacer YO: comprar muestra ofertas de venta y viceversa.
  const [intent, setIntent] = useState<'buy' | 'sell'>('buy');
  const [showPublish, setShowPublish] = useState(false);

  // Para comprar cripto, miro las ofertas de venta (side=sell); para vender, las de compra.
  const oppositeSide: P2pSide = intent === 'buy' ? 'sell' : 'buy';

  const book = useP2pOrders({ side: oppositeSide });
  const mine = useMyP2pOrders();
  const trades = useP2pTrades();

  const takeMut = useTakeP2pOrder();
  const cancelOrderMut = useCancelP2pOrder();
  const confirmTradeMut = useConfirmP2pTrade();
  const cancelTradeMut = useCancelP2pTrade();

  const offers = useMemo(
    () => (book.data ?? []).filter((o) => o.makerUserId !== user?.id),
    [book.data, user?.id],
  );

  function errMsg(err: unknown, fallback: string) {
    return err instanceof ApiError ? err.message : fallback;
  }

  async function onTake(order: P2pOrder) {
    tapLight();
    try {
      await takeMut.mutateAsync(order.id);
      notifySuccess();
      present({ message: 'Oferta tomada. Revisa "Mis trades".', duration: 2000, color: 'success' });
      setTab('trades');
    } catch (err) {
      notifyError();
      present({ message: errMsg(err, 'No se pudo tomar la oferta'), duration: 2400, color: 'danger' });
    }
  }

  async function onCancelOrder(id: string) {
    tapLight();
    try {
      await cancelOrderMut.mutateAsync(id);
      notifySuccess();
      present({ message: 'Oferta cancelada', duration: 1600, color: 'success' });
    } catch (err) {
      notifyError();
      present({ message: errMsg(err, 'No se pudo cancelar'), duration: 2200, color: 'danger' });
    }
  }

  async function onConfirmTrade(id: string) {
    tapLight();
    const totpCode = await stepUp('Autoriza la liberación de cripto');
    if (!totpCode) return;
    try {
      await confirmTradeMut.mutateAsync({ id, totpCode });
      notifySuccess();
      present({ message: 'Pago confirmado. Cripto liberado.', duration: 2000, color: 'success' });
    } catch (err) {
      notifyError();
      present({ message: errMsg(err, 'No se pudo confirmar'), duration: 2400, color: 'danger' });
    }
  }

  async function onCancelTrade(id: string) {
    tapLight();
    try {
      await cancelTradeMut.mutateAsync(id);
      notifySuccess();
      present({ message: 'Trade cancelado', duration: 1600, color: 'success' });
    } catch (err) {
      notifyError();
      present({ message: errMsg(err, 'No se pudo cancelar el trade'), duration: 2200, color: 'danger' });
    }
  }

  return (
    <IonPage>
      <ZenttoHeader title="P2P" />
      <IonContent className="zt-page" fullscreen>
        <div className="zt-screen">
          <IonSegment
            value={tab}
            onIonChange={(e) => {
              selection();
              setTab((e.detail.value as Tab) ?? 'book');
            }}
          >
            <IonSegmentButton value="book">
              <IonLabel>Mercado</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="mine">
              <IonLabel>Mis órdenes</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="trades">
              <IonLabel>Mis trades</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {/* ─────────────── Mercado (order book) ─────────────── */}
          {tab === 'book' && (
            <>
              <div style={{ marginTop: 14 }}>
                <IonSegment
                  value={intent}
                  onIonChange={(e) => {
                    selection();
                    setIntent((e.detail.value as 'buy' | 'sell') ?? 'buy');
                  }}
                >
                  <IonSegmentButton value="buy">
                    <IonLabel>Comprar</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="sell">
                    <IonLabel>Vender</IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              </div>

              <IonButton expand="block" fill="outline" style={{ marginTop: 14 }} onClick={() => { tapLight(); setShowPublish(true); }}>
                <IonIcon slot="start" icon={addCircleOutline} />
                Publicar oferta
              </IonButton>

              <p className="zt-muted" style={{ marginTop: 12 }}>
                {intent === 'buy'
                  ? 'Ofertas de usuarios que venden cripto. Toma una para comprar.'
                  : 'Ofertas de usuarios que compran cripto. Toma una para vender.'}
              </p>

              {book.isLoading && !book.data ? (
                <div style={{ marginTop: 14 }}>
                  <CardSkeleton lines={3} />
                  <CardSkeleton lines={3} />
                </div>
              ) : offers.length === 0 ? (
                <div className="zt-empty zt-enter">
                  <IonIcon icon={storefrontOutline} />
                  <p>No hay ofertas {intent === 'buy' ? 'de venta' : 'de compra'} por ahora.</p>
                </div>
              ) : (
                offers.map((o) => (
                  <P2pOrderCard
                    key={o.id}
                    order={o}
                    intent={intent}
                    onTake={() => onTake(o)}
                    taking={takeMut.isPending}
                  />
                ))
              )}
            </>
          )}

          {/* ─────────────── Mis órdenes ─────────────── */}
          {tab === 'mine' && (
            <>
              <IonButton expand="block" style={{ marginTop: 14 }} onClick={() => { tapLight(); setShowPublish(true); }}>
                <IonIcon slot="start" icon={addCircleOutline} />
                Publicar oferta
              </IonButton>

              {mine.isLoading && !mine.data ? (
                <div style={{ marginTop: 14 }}>
                  <CardSkeleton lines={2} />
                  <CardSkeleton lines={2} />
                </div>
              ) : (mine.data ?? []).length === 0 ? (
                <div className="zt-empty zt-enter">
                  <IonIcon icon={swapHorizontalOutline} />
                  <p>No tienes ofertas publicadas. Publica una para vender o comprar cripto.</p>
                </div>
              ) : (
                (mine.data ?? []).map((o) => {
                  const st = ORDER_STATUS[o.status] ?? { label: o.status, color: 'var(--zt-text-dim)' };
                  return (
                    <div className="zt-card" key={o.id}>
                      <div className="zt-row" style={{ borderBottom: 'none' }}>
                        <span className="zt-token">
                          <span
                            className="zt-status-chip"
                            style={{ color: o.side === 'sell' ? 'var(--zt-danger)' : 'var(--zt-success)' }}
                          >
                            {o.side === 'sell' ? 'Vendo' : 'Compro'}
                          </span>
                          <strong>
                            {formatAmount(o.amount, 6)} {o.asset}
                          </strong>
                        </span>
                        <span className="zt-status-chip" style={{ color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                      <div className="zt-row">
                        <span className="zt-muted">Precio</span>
                        <span>{formatVes(o.priceVes)} / {o.asset}</span>
                      </div>
                      {o.paymentMethod && (
                        <div className="zt-row">
                          <span className="zt-muted">Pago</span>
                          <span style={{ textAlign: 'right' }}>{o.paymentMethod}</span>
                        </div>
                      )}
                      <div className="zt-row" style={{ borderBottom: 'none' }}>
                        <span className="zt-muted">{formatDate(o.createdAt)}</span>
                        {o.status === 'open' && (
                          <IonButton
                            fill="clear"
                            size="small"
                            color="danger"
                            disabled={cancelOrderMut.isPending}
                            onClick={() => onCancelOrder(o.id)}
                          >
                            <IonIcon slot="start" icon={closeCircleOutline} />
                            Cancelar
                          </IonButton>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* ─────────────── Mis trades ─────────────── */}
          {tab === 'trades' && (
            <>
              {trades.isLoading && !trades.data ? (
                <div style={{ marginTop: 14 }}>
                  <CardSkeleton lines={3} />
                  <CardSkeleton lines={3} />
                </div>
              ) : (trades.data ?? []).length === 0 ? (
                <div className="zt-empty zt-enter">
                  <IonIcon icon={swapHorizontalOutline} />
                  <p>No tienes trades todavía. Toma una oferta del mercado para empezar.</p>
                </div>
              ) : (
                (trades.data ?? []).map((t) => (
                  <P2pTradeCard
                    key={t.id}
                    trade={t}
                    isSeller={t.sellerUserId === user?.id}
                    confirming={confirmTradeMut.isPending}
                    cancelling={cancelTradeMut.isPending}
                    onConfirm={() => onConfirmTrade(t.id)}
                    onCancel={() => onCancelTrade(t.id)}
                    onOpen={() => history.push(`/p2p/trade/${t.id}`)}
                  />
                ))
              )}
            </>
          )}
        </div>

        <PublishOfferModal
          isOpen={showPublish}
          onDismiss={() => setShowPublish(false)}
          onPublished={() => {
            setShowPublish(false);
            setTab('mine');
          }}
        />
      </IonContent>
    </IonPage>
  );
}

/** Divide la etiqueta pública de pago en chips ("Pago Móvil · Mercantil" → 2 chips). */
function methodChips(label?: string | null): string[] {
  if (!label) return [];
  return label
    .split(/[·,/|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function P2pOrderCard({
  order,
  intent,
  onTake,
  taking,
}: {
  order: P2pOrder;
  intent: 'buy' | 'sell';
  onTake: () => void;
  taking: boolean;
}) {
  const initial = (order.makerEmail || order.makerUserId || '?').slice(0, 1).toUpperCase();
  const chips = methodChips(order.paymentMethod);
  const isBuy = intent === 'buy';
  return (
    <div className="zt-card">
      {/* Anunciante */}
      <div className="zt-row" style={{ borderBottom: 'none', alignItems: 'center', gap: 8 }}>
        <span className="zt-token" style={{ alignItems: 'center' }}>
          <span
            className="zt-token-badge"
            style={{ width: 30, height: 30, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--zt-indigo)', color: '#fff' }}
          >
            {initial}
          </span>
          <span className="zt-muted" style={{ fontSize: 13 }}>
            {order.makerEmail || shortenAddress(order.makerUserId)}
          </span>
        </span>
      </div>

      {/* Precio destacado (estilo Binance) */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 2px 2px' }}>
        <span style={{ fontSize: 13, color: 'var(--zt-text-dim)' }}>Bs.</span>
        <strong style={{ fontSize: 24, letterSpacing: '-0.5px' }}>
          {formatAmount(order.priceVes, 2)}
        </strong>
        <span className="zt-muted" style={{ fontSize: 12.5 }}>/ {order.asset}</span>
      </div>

      <div className="zt-row" style={{ paddingTop: 6 }}>
        <span className="zt-muted">Disponible</span>
        <span>
          {formatAmount(order.amount, 2)} {order.asset}
        </span>
      </div>

      {/* Métodos de pago como chips — SIN datos sensibles */}
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 2px 2px' }}>
          {chips.map((c) => (
            <span
              key={c}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11.5,
                color: 'var(--zt-text-dim)',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 6,
                padding: '3px 8px',
              }}
            >
              <span style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--zt-cyan)' }} />
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="zt-row" style={{ borderBottom: 'none', paddingTop: 8 }}>
        <span className="zt-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <IonIcon icon={timeOutline} />
          15 min
        </span>
        <IonButton
          size="small"
          color={isBuy ? 'success' : 'danger'}
          disabled={taking}
          onClick={onTake}
          style={{ '--border-radius': '8px' } as React.CSSProperties}
        >
          {taking ? 'Procesando…' : isBuy ? 'Comprar' : 'Vender'}
        </IonButton>
      </div>
    </div>
  );
}

function P2pTradeCard({
  trade,
  isSeller,
  confirming,
  cancelling,
  onConfirm,
  onCancel,
  onOpen,
}: {
  trade: P2pTrade;
  isSeller: boolean;
  confirming: boolean;
  cancelling: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onOpen: () => void;
}) {
  const st = TRADE_STATUS[trade.status] ?? { label: trade.status, color: 'var(--zt-text-dim)' };
  const total = Number(trade.amount) * Number(trade.priceVes);
  const active = trade.status === 'pending' || trade.status === 'paid' || trade.status === 'disputed';
  return (
    <div
      className="zt-card"
      role="button"
      onClick={onOpen}
      style={{ cursor: 'pointer' }}
    >
      <div className="zt-row" style={{ borderBottom: 'none' }}>
        <span className="zt-token">
          <span
            className="zt-status-chip"
            style={{ color: isSeller ? 'var(--zt-danger)' : 'var(--zt-success)' }}
          >
            {isSeller ? 'Vendes' : 'Compras'}
          </span>
          <strong>
            {formatAmount(trade.amount, 6)} {trade.asset}
          </strong>
        </span>
        <span className="zt-status-chip" style={{ color: st.color }}>
          {st.label}
        </span>
      </div>
      <div className="zt-row">
        <span className="zt-muted">Precio</span>
        <span>{formatVes(trade.priceVes)} / {trade.asset}</span>
      </div>
      <div className="zt-row">
        <span className="zt-muted">Total</span>
        <span>{formatVes(total)}</span>
      </div>
      <div className="zt-row" style={{ borderBottom: 'none' }}>
        <span className="zt-muted">{formatDate(trade.createdAt)}</span>
        {trade.status === 'pending' && (
          <span style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <IonButton
              fill="clear"
              size="small"
              color="medium"
              disabled={cancelling}
              onClick={onCancel}
            >
              Cancelar
            </IonButton>
            {isSeller && (
              <IonButton size="small" disabled={confirming} onClick={onConfirm}>
                <IonIcon slot="start" icon={checkmarkCircleOutline} />
                Confirmar
              </IonButton>
            )}
          </span>
        )}
      </div>
      {active && (
        <IonButton expand="block" fill="outline" size="small" style={{ marginTop: 8 }} onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          <IonIcon slot="start" icon={chatbubbleEllipsesOutline} />
          Abrir chat y detalle
        </IonButton>
      )}
    </div>
  );
}
