import { useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonSkeletonText,
  useIonToast,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import {
  paperPlaneOutline,
  checkmarkCircle,
  walletOutline,
  exitOutline,
  shieldOutline,
  searchOutline,
  closeCircle,
  personOutline,
  callOutline,
} from 'ionicons/icons';
import ZenttoHeader from '../components/ZenttoHeader';
import { useAccountBalance, useTransfer, useWithdraw } from '../hooks/usePayments';
import { useUserSearch } from '../hooks/useUsers';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import type { UserSearchResult } from '../api/types';
import { formatAmount } from '../lib/format';
import { tapLight, selection, notifySuccess, notifyError } from '../lib/haptics';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVM_ADDR_RE = /^0x[0-9a-fA-F]{40}$/;
const TOTP_RE = /^\d{6}$/;

type Mode = 'transfer' | 'withdraw';

/** Inicial para el avatar de un destinatario (nombre > email). */
function initialOf(u: { displayName?: string | null; email: string }): string {
  return (u.displayName || u.email || '?').trim().charAt(0).toUpperCase();
}

export default function SendPage() {
  const history = useHistory();
  const [present] = useIonToast();
  const { user } = useAuth();

  const balance = useAccountBalance();
  const transferMut = useTransfer();
  const withdrawMut = useWithdraw();

  const balances = useMemo(() => balance.data ?? [], [balance.data]);
  const assets = balances.map((b) => b.asset);

  const [mode, setMode] = useState<Mode>('transfer');

  // Transferencia interna — buscador de destinatario
  const [query, setQuery] = useState(''); // texto del campo "Para"
  const [debounced, setDebounced] = useState(''); // valor con debounce ~300ms
  const [picked, setPicked] = useState<UserSearchResult | null>(null); // destinatario elegido
  const [asset, setAsset] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [done, setDone] = useState<{ to: string; asset: string; amount: string } | null>(null);

  // Debounce del buscador (no consulta hasta que el usuario deja de teclear).
  useEffect(() => {
    if (picked) return; // ya hay destinatario fijo: no buscar
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query, picked]);

  const search = useUserSearch(picked ? '' : debounced);
  const results = useMemo(() => search.data ?? [], [search.data]);
  const searching = !picked && debounced.length >= 2 && search.isFetching;
  // Email destino efectivo: el del destinatario elegido, o el texto si es un email válido (fallback).
  const typedIsEmail = EMAIL_RE.test(query.trim());
  const toEmail = picked?.email ?? (typedIsEmail ? query.trim() : '');

  // Retiro on-chain (USDC)
  const [toAddress, setToAddress] = useState('');
  const [wAmount, setWAmount] = useState('');
  const [totp, setTotp] = useState('');
  const [wDone, setWDone] = useState(false);

  const effectiveAsset = asset || assets[0] || '';
  const selectedBal = balances.find((b) => b.asset === effectiveAsset);
  const available = Number(selectedBal?.available ?? '0');

  // Saldo USDC para retiros
  const usdcBal = balances.find((b) => b.asset?.toUpperCase() === 'USDC');
  const usdcAvailable = Number(usdcBal?.available ?? '0');

  // Validación transferencia
  const validEmail = EMAIL_RE.test(toEmail.trim());
  const hasRecipient = !!picked || validEmail; // destinatario elegido o email válido escrito
  const amountNum = Number(amount);
  const validAmount = amountNum > 0 && amountNum <= available;
  const overBalance = amountNum > 0 && amountNum > available;
  const canTransfer = hasRecipient && validAmount && !!effectiveAsset && !transferMut.isPending;

  // Validación retiro
  const validAddr = EVM_ADDR_RE.test(toAddress.trim());
  const wAmountNum = Number(wAmount);
  const validWAmount = wAmountNum > 0 && wAmountNum <= usdcAvailable;
  const overWBalance = wAmountNum > 0 && wAmountNum > usdcAvailable;
  const validTotp = TOTP_RE.test(totp.trim());
  const canWithdraw =
    validAddr && validWAmount && validTotp && !!user?.totpEnabled && !withdrawMut.isPending;

  function selectRecipient(u: UserSearchResult) {
    selection();
    setPicked(u);
    setQuery(u.displayName || u.email);
    setDebounced('');
  }

  function clearRecipient() {
    tapLight();
    setPicked(null);
    setQuery('');
    setDebounced('');
  }

  async function handleSend() {
    if (!canTransfer) return;
    tapLight();
    const to = toEmail.trim();
    const toLabel = picked?.displayName || picked?.email || to;
    try {
      await transferMut.mutateAsync({
        toEmail: to,
        asset: effectiveAsset,
        amount: amount.trim(),
      });
      setDone({ to: toLabel, asset: effectiveAsset, amount: amount.trim() });
      notifySuccess();
      present({ message: 'Transferencia enviada', duration: 1600, color: 'success' });
      setPicked(null);
      setQuery('');
      setDebounced('');
      setAmount('');
    } catch (err) {
      notifyError();
      const msg = err instanceof ApiError ? err.message : 'No se pudo completar la transferencia';
      present({ message: msg, duration: 2200, color: 'danger' });
    }
  }

  async function handleWithdraw() {
    if (!user?.totpEnabled) {
      present({ message: 'Activa el 2FA para retirar', duration: 2000, color: 'warning' });
      history.push('/security');
      return;
    }
    if (!canWithdraw) return;
    tapLight();
    try {
      await withdrawMut.mutateAsync({
        asset: 'USDC',
        amount: wAmount.trim(),
        toAddress: toAddress.trim(),
        totpCode: totp.trim(),
      });
      setWDone(true);
      notifySuccess();
      present({ message: 'Retiro en proceso', duration: 1800, color: 'success' });
      setWAmount('');
      setTotp('');
    } catch (err) {
      notifyError();
      const msg = err instanceof ApiError ? err.message : 'No se pudo completar el retiro';
      present({ message: msg, duration: 2600, color: 'danger' });
    }
  }

  return (
    <IonPage>
      <ZenttoHeader title="Enviar" />
      <IonContent className="zt-page" fullscreen>
        <div className="zt-screen">
          <IonSegment
            value={mode}
            onIonChange={(e) => {
              selection();
              setMode((e.detail.value as Mode) ?? 'transfer');
            }}
          >
            <IonSegmentButton value="transfer">
              <IonLabel>Transferir</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="withdraw">
              <IonLabel>Retirar</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {balance.isLoading && !balance.data ? (
            <div style={{ textAlign: 'center', padding: 28 }}>
              <IonSpinner name="crescent" />
            </div>
          ) : mode === 'transfer' ? (
            // ───────────────────────── Transferencia interna ─────────────────────────
            balances.length === 0 ? (
              <div className="zt-empty">
                <IonIcon icon={walletOutline} />
                <p>No tienes saldo para enviar. Obtén saldo de prueba en Inicio.</p>
                <IonButton onClick={() => history.push('/home')}>Ir a Inicio</IonButton>
              </div>
            ) : (
              <>
                <p className="zt-muted" style={{ marginTop: 12 }}>
                  Busca a otro usuario de Zentto por correo, teléfono o nombre. La operación se
                  registra en el ledger de inmediato.
                </p>

                {picked ? (
                  // ── Destinatario elegido (chip/tarjeta) ──
                  <div className="zt-recipient">
                    <div className="zt-recipient-avatar">{initialOf(picked)}</div>
                    <div className="zt-recipient-id">
                      <div className="zt-recipient-name">
                        {picked.displayName || picked.email}
                      </div>
                      <div className="zt-recipient-sub">
                        {picked.displayName ? picked.email : picked.phone || 'Usuario Zentto'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="zt-recipient-clear"
                      onClick={clearRecipient}
                      aria-label="Cambiar destinatario"
                    >
                      <IonIcon icon={closeCircle} />
                    </button>
                  </div>
                ) : (
                  <>
                    <IonItem className="zt-card zt-search-item" lines="none">
                      <IonIcon
                        slot="start"
                        icon={searchOutline}
                        style={{ color: 'var(--zt-text-dim)', fontSize: 18 }}
                      />
                      <IonInput
                        label="Para"
                        labelPlacement="stacked"
                        autocapitalize="off"
                        value={query}
                        onIonInput={(e) => setQuery(e.detail.value ?? '')}
                        placeholder="Correo, teléfono o nombre"
                      />
                    </IonItem>

                    {/* Resultados / estados del buscador */}
                    {debounced.length >= 2 && (
                      <div className="zt-results zt-stagger">
                        {searching ? (
                          // Skeleton mientras busca
                          [0, 1, 2].map((i) => (
                            <div className="zt-result" key={i}>
                              <IonSkeletonText
                                animated
                                className="zt-sk-circle"
                                style={{ width: 38, height: 38 }}
                              />
                              <div style={{ flex: 1 }}>
                                <IonSkeletonText animated style={{ width: '55%', height: 12 }} />
                                <IonSkeletonText
                                  animated
                                  style={{ width: '40%', height: 10, marginTop: 6 }}
                                />
                              </div>
                            </div>
                          ))
                        ) : results.length > 0 ? (
                          results.map((u) => (
                            <button
                              type="button"
                              className="zt-result"
                              key={u.id}
                              onClick={() => selectRecipient(u)}
                            >
                              <div className="zt-recipient-avatar">{initialOf(u)}</div>
                              <div className="zt-recipient-id">
                                <div className="zt-recipient-name">
                                  {u.displayName || u.email}
                                </div>
                                <div className="zt-recipient-sub">
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                    <IonIcon icon={personOutline} style={{ fontSize: 12 }} />
                                    {u.email}
                                  </span>
                                  {u.phone && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 10 }}>
                                      <IonIcon icon={callOutline} style={{ fontSize: 12 }} />
                                      {u.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          // Sin resultados — permitir email exacto como fallback
                          <div className="zt-result-empty">
                            <p className="zt-muted" style={{ margin: 0 }}>
                              No se encontró ningún usuario.
                            </p>
                            {typedIsEmail ? (
                              <button
                                type="button"
                                className="zt-result"
                                style={{ marginTop: 8 }}
                                onClick={() =>
                                  selectRecipient({ id: query.trim(), email: query.trim() })
                                }
                              >
                                <div className="zt-recipient-avatar">
                                  {query.trim().charAt(0).toUpperCase()}
                                </div>
                                <div className="zt-recipient-id">
                                  <div className="zt-recipient-name">Enviar a este correo</div>
                                  <div className="zt-recipient-sub">{query.trim()}</div>
                                </div>
                              </button>
                            ) : (
                              <p className="zt-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                                Escribe el correo exacto para enviarle igualmente.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <IonItem className="zt-card" lines="none">
                  <IonSelect
                    label="Activo"
                    labelPlacement="stacked"
                    value={effectiveAsset}
                    onIonChange={(e) => setAsset(e.detail.value)}
                    interface="action-sheet"
                  >
                    {assets.map((a) => (
                      <IonSelectOption key={a} value={a}>
                        {a}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>

                <IonItem className="zt-card" lines="none">
                  <IonInput
                    label={`Monto (${effectiveAsset || '—'})`}
                    labelPlacement="stacked"
                    type="number"
                    inputmode="decimal"
                    value={amount}
                    onIonInput={(e) => setAmount(e.detail.value ?? '')}
                    placeholder="0.00"
                  />
                </IonItem>
                <div className="zt-row" style={{ borderBottom: 'none', padding: '6px 4px 0' }}>
                  <span className="zt-muted">Disponible</span>
                  <button
                    type="button"
                    className="zt-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => setAmount(selectedBal?.available ?? '')}
                  >
                    {formatAmount(selectedBal?.available)} {effectiveAsset}
                  </button>
                </div>
                {overBalance && (
                  <p className="zt-muted" style={{ color: 'var(--zt-danger)', margin: '6px 4px' }}>
                    El monto supera tu saldo disponible.
                  </p>
                )}

                <IonButton
                  expand="block"
                  style={{ marginTop: 18 }}
                  disabled={!canTransfer}
                  onClick={handleSend}
                >
                  <IonIcon slot="start" icon={paperPlaneOutline} />
                  {transferMut.isPending ? 'Enviando…' : 'Enviar'}
                </IonButton>

                {done && (
                  <div className="zt-card" style={{ borderColor: 'var(--zt-success)' }}>
                    <div className="zt-row" style={{ borderBottom: 'none' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--zt-success)' }}>
                        <IonIcon icon={checkmarkCircle} />
                        <strong>Transferencia enviada</strong>
                      </span>
                    </div>
                    <div className="zt-row">
                      <span className="zt-muted">Para</span>
                      <span>{done.to}</span>
                    </div>
                    <div className="zt-row">
                      <span className="zt-muted">Monto</span>
                      <strong>
                        {formatAmount(done.amount)} {done.asset}
                      </strong>
                    </div>
                    <IonButton
                      fill="clear"
                      size="small"
                      style={{ marginTop: 6 }}
                      onClick={() => history.push('/movements')}
                    >
                      Ver en movimientos
                    </IonButton>
                  </div>
                )}
              </>
            )
          ) : (
            // ───────────────────────── Retiro on-chain ─────────────────────────
            <>
              <p className="zt-muted" style={{ marginTop: 12 }}>
                Retira USDC a una wallet externa (Sepolia testnet). Requiere verificación 2FA con
                Google Authenticator.
              </p>

              {!user?.totpEnabled && (
                <div className="zt-banner">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IonIcon icon={shieldOutline} />
                    Necesitas activar el 2FA para poder retirar.
                  </span>
                  <IonButton
                    fill="clear"
                    size="small"
                    style={{ marginTop: 6 }}
                    onClick={() => history.push('/security')}
                  >
                    Activar 2FA
                  </IonButton>
                </div>
              )}

              <IonItem className="zt-card" lines="none">
                <IonInput
                  label="Dirección de destino (0x…)"
                  labelPlacement="stacked"
                  autocapitalize="off"
                  value={toAddress}
                  onIonInput={(e) => setToAddress((e.detail.value ?? '').trim())}
                  placeholder="0x0000000000000000000000000000000000000000"
                />
              </IonItem>
              {toAddress && !validAddr && (
                <p className="zt-muted" style={{ color: 'var(--zt-danger)', margin: '6px 4px' }}>
                  Dirección EVM inválida (0x + 40 hex).
                </p>
              )}

              <IonItem className="zt-card" lines="none">
                <IonInput
                  label="Monto (USDC)"
                  labelPlacement="stacked"
                  type="number"
                  inputmode="decimal"
                  value={wAmount}
                  onIonInput={(e) => setWAmount(e.detail.value ?? '')}
                  placeholder="0.00"
                />
              </IonItem>
              <div className="zt-row" style={{ borderBottom: 'none', padding: '6px 4px 0' }}>
                <span className="zt-muted">Disponible</span>
                <button
                  type="button"
                  className="zt-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => setWAmount(usdcBal?.available ?? '')}
                >
                  {formatAmount(usdcBal?.available ?? '0')} USDC
                </button>
              </div>
              {overWBalance && (
                <p className="zt-muted" style={{ color: 'var(--zt-danger)', margin: '6px 4px' }}>
                  El monto supera tu saldo USDC disponible.
                </p>
              )}

              <IonItem className="zt-card" lines="none">
                <IonInput
                  label="Código 2FA (Google Authenticator)"
                  labelPlacement="stacked"
                  type="number"
                  inputmode="numeric"
                  maxlength={6}
                  value={totp}
                  onIonInput={(e) => setTotp((e.detail.value ?? '').replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                />
              </IonItem>

              <IonButton
                expand="block"
                style={{ marginTop: 18 }}
                disabled={!canWithdraw}
                onClick={handleWithdraw}
              >
                <IonIcon slot="start" icon={exitOutline} />
                {withdrawMut.isPending ? 'Procesando…' : 'Retirar'}
              </IonButton>

              {wDone && (
                <div className="zt-card" style={{ borderColor: 'var(--zt-success)' }}>
                  <div className="zt-row" style={{ borderBottom: 'none' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--zt-success)' }}>
                      <IonIcon icon={checkmarkCircle} />
                      <strong>Retiro en proceso</strong>
                    </span>
                  </div>
                  <p className="zt-muted" style={{ margin: '6px 0 0' }}>
                    Tu retiro se está procesando on-chain. El saldo se actualizará al confirmarse.
                  </p>
                  <IonButton
                    fill="clear"
                    size="small"
                    style={{ marginTop: 6 }}
                    onClick={() => history.push('/movements')}
                  >
                    Ver en movimientos
                  </IonButton>
                </div>
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
