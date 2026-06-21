import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonToast,
} from '@ionic/react';
import {
  alertCircleOutline,
  cameraOutline,
  checkmarkCircleOutline,
  copyOutline,
  imageOutline,
  lockClosedOutline,
  sendOutline,
  timeOutline,
} from 'ionicons/icons';
import {
  useConfirmP2pTrade,
  useDisputeP2pTrade,
  useMarkP2pTradePaid,
  useP2pMessages,
  useP2pTrade,
  useSendP2pMessage,
} from '../hooks/useP2p';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { formatAmount, formatDateTime, formatVes, shortenAddress } from '../lib/format';
import { imageToCompressedDataUrl, tryNativeCamera } from '../lib/capture';
import { copyText } from '../lib/clipboard';
import { tapLight, notifySuccess, notifyError } from '../lib/haptics';
import type { P2pTradeStatus } from '../api/types';

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'Esperando pago', color: 'var(--zt-warning)' },
  paid: { label: 'Pago marcado', color: 'var(--zt-cyan)' },
  completed: { label: 'Completado', color: 'var(--zt-success)' },
  cancelled: { label: 'Cancelado', color: 'var(--zt-text-dim)' },
  disputed: { label: 'En disputa', color: 'var(--zt-danger)' },
  expired: { label: 'Expirado', color: 'var(--zt-text-dim)' },
};

function statusMeta(s: P2pTradeStatus) {
  return STATUS_META[s] ?? { label: String(s), color: 'var(--zt-text-dim)' };
}

/** Minutos restantes hasta una fecha límite (negativo si ya venció). */
function minutesLeft(deadline?: string | null): number | null {
  if (!deadline) return null;
  return Math.round((new Date(deadline).getTime() - Date.now()) / 60_000);
}

export default function TradeDetailPage({ tradeId }: { tradeId: string }) {
  const [present] = useIonToast();
  const { user } = useAuth();
  const tradeQ = useP2pTrade(tradeId);
  const messagesQ = useP2pMessages(tradeId);

  const confirmMut = useConfirmP2pTrade();
  const paidMut = useMarkP2pTradePaid();
  const disputeMut = useDisputeP2pTrade();
  const sendMut = useSendP2pMessage(tradeId);

  const [draft, setDraft] = useState('');
  const [, forceTick] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-render cada 30s para refrescar los contadores de tiempo del escrow.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll al último mensaje cuando llega contenido nuevo.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messagesQ.data?.length]);

  const trade = tradeQ.data;
  const isSeller = !!trade && trade.sellerUserId === user?.id;
  const counterparty = isSeller ? trade?.buyerEmail : trade?.sellerEmail;
  const st = trade ? statusMeta(trade.status) : null;
  const total = trade ? Number(trade.amount) * Number(trade.priceVes) : 0;

  const isPending = trade?.status === 'pending';
  const isPaid = trade?.status === 'paid';
  const isOpen = isPending || isPaid;

  const countdown = useMemo(() => {
    if (!trade) return null;
    if (isPending) {
      const m = minutesLeft(trade.paymentDeadline);
      if (m === null) return null;
      return { label: 'Tiempo para pagar', mins: m };
    }
    if (isPaid) {
      const m = minutesLeft(trade.releaseDeadline);
      if (m === null) return null;
      return { label: 'Tiempo para liberar', mins: m };
    }
    return null;
  }, [trade, isPending, isPaid]);

  function errMsg(err: unknown, fallback: string) {
    return err instanceof ApiError ? err.message : fallback;
  }

  async function copy(text: string) {
    const ok = await copyText(text);
    present({ message: ok ? 'Datos de pago copiados' : 'No se pudo copiar', duration: 1200, color: ok ? 'success' : 'danger' });
  }

  async function onMarkPaid() {
    tapLight();
    try {
      await paidMut.mutateAsync(tradeId);
      notifySuccess();
      present({ message: 'Pago marcado. El vendedor liberará el cripto.', duration: 2200, color: 'success' });
    } catch (err) {
      notifyError();
      present({ message: errMsg(err, 'No se pudo marcar el pago'), duration: 2400, color: 'danger' });
    }
  }

  async function onConfirm() {
    tapLight();
    try {
      await confirmMut.mutateAsync(tradeId);
      notifySuccess();
      present({ message: 'Pago confirmado. Cripto liberado al comprador.', duration: 2200, color: 'success' });
    } catch (err) {
      notifyError();
      present({ message: errMsg(err, 'No se pudo confirmar'), duration: 2400, color: 'danger' });
    }
  }

  async function onDispute() {
    const reason = window.prompt('Describe el problema para el árbitro:');
    if (!reason || !reason.trim()) return;
    tapLight();
    try {
      await disputeMut.mutateAsync({ id: tradeId, reason: reason.trim() });
      notifySuccess();
      present({ message: 'Disputa abierta. Un árbitro la revisará.', duration: 2400, color: 'warning' });
    } catch (err) {
      notifyError();
      present({ message: errMsg(err, 'No se pudo abrir la disputa'), duration: 2400, color: 'danger' });
    }
  }

  async function onSendText() {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    try {
      await sendMut.mutateAsync({ body });
    } catch (err) {
      present({ message: errMsg(err, 'No se pudo enviar'), duration: 2200, color: 'danger' });
      setDraft(body);
    }
  }

  async function sendEvidence(blob: Blob) {
    try {
      const dataUrl = await imageToCompressedDataUrl(blob);
      await sendMut.mutateAsync({ attachment: dataUrl, body: 'Comprobante de pago' });
      notifySuccess();
      present({ message: 'Evidencia enviada', duration: 1600, color: 'success' });
    } catch (err) {
      notifyError();
      present({ message: errMsg(err, 'No se pudo enviar la evidencia'), duration: 2400, color: 'danger' });
    }
  }

  async function onAttachEvidence() {
    tapLight();
    // Cámara nativa si está disponible; si no, cae al selector de archivos del WebView.
    const img = await tryNativeCamera('photos');
    if (img) {
      await sendEvidence(img.blob);
      return;
    }
    fileInputRef.current?.click();
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void sendEvidence(file);
  }

  return (
    <IonPage>
      <IonHeader className="zt-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/p2p" text="" />
          </IonButtons>
          <IonTitle>Trade P2P</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="zt-page" fullscreen>
        <div className="zt-screen">
          {tradeQ.isLoading && !trade ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
              <IonSpinner name="dots" />
            </div>
          ) : !trade ? (
            <div className="zt-empty">
              <IonIcon icon={alertCircleOutline} />
              <p>No se pudo cargar el trade.</p>
            </div>
          ) : (
            <>
              {/* Resumen del trade */}
              <div className="zt-card" style={{ marginTop: 8 }}>
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
                  {st && (
                    <span className="zt-status-chip" style={{ color: st.color }}>
                      {st.label}
                    </span>
                  )}
                </div>
                <div className="zt-row">
                  <span className="zt-muted">Precio</span>
                  <span>
                    {formatVes(trade.priceVes)} / {trade.asset}
                  </span>
                </div>
                <div className="zt-row">
                  <span className="zt-muted">Total a pagar</span>
                  <strong>{formatVes(total)}</strong>
                </div>
                <div className="zt-row">
                  <span className="zt-muted">{isSeller ? 'Comprador' : 'Vendedor'}</span>
                  <span>{counterparty || shortenAddress(isSeller ? trade.buyerUserId : trade.sellerUserId)}</span>
                </div>
                <div className="zt-row" style={{ borderBottom: 'none' }}>
                  <span className="zt-muted">Creado</span>
                  <span className="zt-muted">{formatDateTime(trade.createdAt)}</span>
                </div>
              </div>

              {/* Datos de pago revelados (solo tras aceptar la operación) */}
              {trade.paymentDetails ? (
                <div
                  className="zt-card"
                  style={{ borderColor: 'rgba(34,211,238,0.35)', background: 'rgba(34,211,238,0.06)' }}
                >
                  <div className="zt-row" style={{ borderBottom: 'none' }}>
                    <span className="zt-token" style={{ alignItems: 'center', gap: 6 }}>
                      <IonIcon icon={lockClosedOutline} style={{ color: 'var(--zt-cyan)' }} />
                      <strong>Datos para pagar</strong>
                    </span>
                    <IonButton fill="clear" size="small" onClick={() => copy(trade.paymentDetails as string)}>
                      <IonIcon slot="start" icon={copyOutline} />
                      Copiar
                    </IonButton>
                  </div>
                  {trade.paymentMethod && (
                    <p className="zt-muted" style={{ margin: '2px 0 6px' }}>{trade.paymentMethod}</p>
                  )}
                  <p className="zt-mono" style={{ margin: 0, wordBreak: 'break-word' }}>
                    {trade.paymentDetails}
                  </p>
                  <p className="zt-muted" style={{ margin: '8px 0 0', fontSize: 11.5 }}>
                    {isSeller
                      ? 'Estos son tus datos compartidos con el comprador.'
                      : 'Paga exactamente a estos datos y marca el pago cuando termines.'}
                  </p>
                </div>
              ) : (
                isOpen && (
                  <div
                    className="zt-banner"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderColor: 'rgba(255,255,255,0.10)',
                      color: 'var(--zt-text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <IonIcon icon={lockClosedOutline} />
                    La contraparte no registró datos de pago; coordínalos por el chat.
                  </div>
                )
              )}

              {/* Contador de la ventana de tiempo (escrow) */}
              {countdown && (
                <div
                  className="zt-banner"
                  style={{
                    background: countdown.mins < 0 ? 'rgba(248,113,113,0.10)' : 'rgba(34,211,238,0.10)',
                    borderColor: countdown.mins < 0 ? 'rgba(248,113,113,0.30)' : 'rgba(34,211,238,0.30)',
                    color: countdown.mins < 0 ? 'var(--zt-danger)' : 'var(--zt-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <IonIcon icon={timeOutline} />
                  {countdown.mins < 0
                    ? `${countdown.label}: vencido`
                    : `${countdown.label}: ${countdown.mins} min`}
                </div>
              )}

              {/* Instrucción según rol/estado */}
              {isOpen && (
                <p className="zt-muted" style={{ marginTop: 12 }}>
                  {isSeller
                    ? isPaid
                      ? 'El comprador marcó el pago. Verifica que recibiste el fiat y libera el cripto.'
                      : 'Espera a que el comprador pague el fiat por el método acordado.'
                    : isPaid
                      ? 'Marcaste el pago. Espera a que el vendedor confirme y libere el cripto.'
                      : 'Paga el fiat al vendedor por el método acordado y marca el pago aquí.'}
                </p>
              )}

              {trade.status === 'disputed' && (
                <div
                  className="zt-banner"
                  style={{
                    background: 'rgba(248,113,113,0.10)',
                    borderColor: 'rgba(248,113,113,0.30)',
                    color: 'var(--zt-danger)',
                  }}
                >
                  En disputa — un árbitro revisará el caso y el chat. Adjunta tus evidencias abajo.
                </div>
              )}

              {/* Acciones del escrow */}
              {isOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  {!isSeller && isPending && (
                    <IonButton expand="block" disabled={paidMut.isPending} onClick={onMarkPaid}>
                      <IonIcon slot="start" icon={checkmarkCircleOutline} />
                      Ya pagué
                    </IonButton>
                  )}
                  {isSeller && (
                    <IonButton expand="block" disabled={confirmMut.isPending} onClick={onConfirm}>
                      <IonIcon slot="start" icon={checkmarkCircleOutline} />
                      Confirmar pago y liberar
                    </IonButton>
                  )}
                  <IonButton
                    expand="block"
                    fill="outline"
                    color="danger"
                    disabled={disputeMut.isPending}
                    onClick={onDispute}
                  >
                    <IonIcon slot="start" icon={alertCircleOutline} />
                    Abrir disputa
                  </IonButton>
                </div>
              )}

              {/* Chat + evidencias */}
              <h3 style={{ margin: '20px 0 8px' }}>Chat</h3>
              <div className="zt-card" style={{ padding: 10 }}>
                {messagesQ.isLoading && !messagesQ.data ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
                    <IonSpinner name="dots" />
                  </div>
                ) : (messagesQ.data ?? []).length === 0 ? (
                  <p className="zt-muted" style={{ textAlign: 'center', margin: '12px 0' }}>
                    Aún no hay mensajes. Coordina el pago y comparte tu comprobante.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(messagesQ.data ?? []).map((msg) => {
                      const mine = msg.senderUserId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: mine ? 'flex-end' : 'flex-start',
                            maxWidth: '82%',
                            background: mine ? 'var(--zt-indigo)' : 'rgba(255,255,255,0.06)',
                            color: mine ? '#fff' : 'var(--zt-text)',
                            borderRadius: 12,
                            padding: '8px 10px',
                          }}
                        >
                          {msg.attachment && (
                            <img
                              src={msg.attachment}
                              alt="Evidencia de pago"
                              style={{ width: '100%', borderRadius: 8, marginBottom: msg.body ? 6 : 0 }}
                            />
                          )}
                          {msg.body && <div style={{ fontSize: 13.5 }}>{msg.body}</div>}
                          <div
                            style={{
                              fontSize: 10.5,
                              opacity: 0.7,
                              marginTop: 3,
                              textAlign: 'right',
                            }}
                          >
                            {formatDateTime(msg.createdAt)}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {/* Barra de envío */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={onFilePicked}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <IonButton
                  fill="clear"
                  disabled={sendMut.isPending}
                  onClick={onAttachEvidence}
                  aria-label="Adjuntar evidencia"
                >
                  <IonIcon slot="icon-only" icon={imageOutline} />
                </IonButton>
                <div className="zt-card" style={{ flex: 1, margin: 0, padding: '0 10px' }}>
                  <IonInput
                    value={draft}
                    placeholder="Escribe un mensaje…"
                    onIonInput={(e) => setDraft(e.detail.value ?? '')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void onSendText();
                    }}
                  />
                </div>
                <IonButton
                  disabled={sendMut.isPending || !draft.trim()}
                  onClick={onSendText}
                  aria-label="Enviar"
                >
                  <IonIcon slot="icon-only" icon={sendOutline} />
                </IonButton>
              </div>
              <p className="zt-muted" style={{ fontSize: 11.5, margin: '8px 2px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IonIcon icon={cameraOutline} />
                Adjunta el comprobante del pago (Pago Móvil / transferencia) como evidencia.
              </p>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
