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
  hourglassOutline,
  imageOutline,
  lockClosedOutline,
  sendOutline,
  timeOutline,
} from 'ionicons/icons';
import {
  useConfirmP2pTrade,
  useDisputeP2pTrade,
  useExtendP2pTrade,
  useMarkP2pTradePaid,
  useP2pMessages,
  useP2pTrade,
  useSendP2pMessage,
} from '../hooks/useP2p';
import { useStepUp } from '../hooks/useStepUp';
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

/** Formatea una duración en ms como "mm:ss" (o "—" si no aplica). */
function fmtClock(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  const sign = ms < 0 ? '-' : '';
  const total = Math.floor(Math.abs(ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${sign}${m}:${String(s).padStart(2, '0')}`;
}

export default function TradeDetailPage({ tradeId }: { tradeId: string }) {
  const [present] = useIonToast();
  const { user } = useAuth();
  const tradeQ = useP2pTrade(tradeId);
  const messagesQ = useP2pMessages(tradeId);

  const confirmMut = useConfirmP2pTrade();
  const paidMut = useMarkP2pTradePaid();
  const disputeMut = useDisputeP2pTrade();
  const extendMut = useExtendP2pTrade();
  const sendMut = useSendP2pMessage(tradeId);
  const stepUp = useStepUp();

  const [draft, setDraft] = useState('');
  const [, forceTick] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-render cada 1s para el reloj en vivo del escrow (tiempo transcurrido/restante).
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1_000);
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

  const clock = useMemo(() => {
    if (!trade) return null;
    const now = Date.now();
    if (isPending && trade.paymentDeadline) {
      const start = new Date(trade.createdAt as string).getTime();
      return {
        label: 'Tiempo para pagar',
        elapsedMs: now - start,
        remainingMs: new Date(trade.paymentDeadline).getTime() - now,
        totalMs: new Date(trade.paymentDeadline).getTime() - start,
      };
    }
    if (isPaid && trade.releaseDeadline) {
      const start = trade.paidAt ? new Date(trade.paidAt).getTime() : now;
      return {
        label: 'Tiempo para liberar',
        elapsedMs: now - start,
        remainingMs: new Date(trade.releaseDeadline).getTime() - now,
        totalMs: new Date(trade.releaseDeadline).getTime() - start,
      };
    }
    return null;
  }, [trade, isPending, isPaid]);

  const extensionsLeft = trade?.extensionsLeft ?? 0;
  const expired = !!clock && clock.remainingMs <= 0;

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
    // Liberar cripto mueve fondos → segundo factor (huella + 2FA).
    const totpCode = await stepUp('Autoriza la liberación de cripto');
    if (!totpCode) return;
    try {
      await confirmMut.mutateAsync({ id: tradeId, totpCode });
      notifySuccess();
      present({ message: 'Pago confirmado. Cripto liberado al comprador.', duration: 2200, color: 'success' });
    } catch (err) {
      notifyError();
      present({ message: errMsg(err, 'No se pudo confirmar'), duration: 2400, color: 'danger' });
    }
  }

  async function onExtend() {
    tapLight();
    try {
      const r = await extendMut.mutateAsync(tradeId);
      notifySuccess();
      present({
        message: `Tiempo extendido +15 min. Te quedan ${r.extensionsLeft} extensiones.`,
        duration: 2400,
        color: 'success',
      });
    } catch (err) {
      notifyError();
      present({ message: errMsg(err, 'No se pudo extender el tiempo'), duration: 2400, color: 'danger' });
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

              {/* Reloj de la ventana de tiempo del escrow */}
              {clock && (
                <div
                  className="zt-card"
                  style={{
                    borderColor: expired ? 'rgba(248,113,113,0.35)' : 'rgba(34,211,238,0.30)',
                    background: expired ? 'rgba(248,113,113,0.06)' : 'rgba(34,211,238,0.05)',
                  }}
                >
                  <div className="zt-row" style={{ borderBottom: 'none' }}>
                    <span className="zt-token" style={{ alignItems: 'center', gap: 6 }}>
                      <IonIcon
                        icon={timeOutline}
                        style={{ color: expired ? 'var(--zt-danger)' : 'var(--zt-cyan)' }}
                      />
                      <strong>{clock.label}</strong>
                    </span>
                    <strong
                      style={{
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: 20,
                        color: expired ? 'var(--zt-danger)' : 'var(--zt-cyan)',
                      }}
                    >
                      {expired ? 'Vencido' : fmtClock(clock.remainingMs)}
                    </strong>
                  </div>

                  {/* Barra de progreso del tiempo */}
                  <div
                    style={{
                      height: 6,
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.08)',
                      overflow: 'hidden',
                      margin: '8px 0 6px',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, (clock.elapsedMs / clock.totalMs) * 100))}%`,
                        background: expired ? 'var(--zt-danger)' : 'var(--zt-cyan)',
                        transition: 'width 1s linear',
                      }}
                    />
                  </div>

                  <div className="zt-row" style={{ borderBottom: 'none', padding: 0 }}>
                    <span className="zt-muted" style={{ fontSize: 12 }}>
                      Transcurrido {fmtClock(clock.elapsedMs)}
                    </span>
                    <span className="zt-muted" style={{ fontSize: 12 }}>
                      {extensionsLeft > 0
                        ? `${extensionsLeft} extensión(es) disponibles`
                        : 'Sin extensiones'}
                    </span>
                  </div>

                  {/* Extender tiempo (mientras queden extensiones) */}
                  {extensionsLeft > 0 ? (
                    <IonButton
                      expand="block"
                      fill="outline"
                      size="small"
                      style={{ marginTop: 10 }}
                      disabled={extendMut.isPending}
                      onClick={onExtend}
                    >
                      <IonIcon slot="start" icon={hourglassOutline} />
                      Extender +15 min
                    </IonButton>
                  ) : (
                    <p className="zt-muted" style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--zt-warning)' }}>
                      Se agotaron las extensiones. Si el tiempo vence, la operación pasa a disputa
                      para que un árbitro la resuelva.
                    </p>
                  )}
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
