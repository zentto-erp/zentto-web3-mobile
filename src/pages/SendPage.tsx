import { useMemo, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  useIonToast,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import {
  paperPlaneOutline,
  checkmarkCircle,
  walletOutline,
} from 'ionicons/icons';
import ZenttoHeader from '../components/ZenttoHeader';
import { useAccountBalance, useTransfer } from '../hooks/usePayments';
import { ApiError } from '../api/client';
import { formatAmount } from '../lib/format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SendPage() {
  const history = useHistory();
  const [present] = useIonToast();

  const balance = useAccountBalance();
  const transferMut = useTransfer();

  const balances = useMemo(() => balance.data ?? [], [balance.data]);
  const assets = balances.map((b) => b.asset);

  const [toEmail, setToEmail] = useState('');
  const [asset, setAsset] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [done, setDone] = useState<{ to: string; asset: string; amount: string } | null>(null);

  // Asset por defecto: el primero con saldo disponible.
  const effectiveAsset = asset || assets[0] || '';
  const selectedBal = balances.find((b) => b.asset === effectiveAsset);
  const available = Number(selectedBal?.available ?? '0');

  const validEmail = EMAIL_RE.test(toEmail.trim());
  const amountNum = Number(amount);
  const validAmount = amountNum > 0 && amountNum <= available;
  const overBalance = amountNum > 0 && amountNum > available;
  const canSubmit = validEmail && validAmount && !!effectiveAsset && !transferMut.isPending;

  async function handleSend() {
    if (!canSubmit) return;
    try {
      await transferMut.mutateAsync({
        toEmail: toEmail.trim(),
        asset: effectiveAsset,
        amount: amount.trim(),
      });
      setDone({ to: toEmail.trim(), asset: effectiveAsset, amount: amount.trim() });
      present({ message: 'Transferencia enviada', duration: 1600, color: 'success' });
      setToEmail('');
      setAmount('');
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo completar la transferencia';
      present({ message: msg, duration: 2200, color: 'danger' });
    }
  }

  return (
    <IonPage>
      <ZenttoHeader title="Enviar" />
      <IonContent className="zt-page" fullscreen>
        <div className="zt-screen">
          {balance.isLoading && !balance.data ? (
            <div style={{ textAlign: 'center', padding: 28 }}>
              <IonSpinner name="crescent" />
            </div>
          ) : balances.length === 0 ? (
            <div className="zt-empty">
              <IonIcon icon={walletOutline} />
              <p>No tienes saldo para enviar. Obtén saldo de prueba en Inicio.</p>
              <IonButton onClick={() => history.push('/home')}>Ir a Inicio</IonButton>
            </div>
          ) : (
            <>
              <p className="zt-muted">
                Envía saldo a otro usuario de Zentto por su email. La operación se registra en
                el ledger de inmediato.
              </p>

              <IonItem className="zt-card" lines="none">
                <IonInput
                  label="Email del destinatario"
                  labelPlacement="stacked"
                  type="email"
                  inputmode="email"
                  autocapitalize="off"
                  value={toEmail}
                  onIonInput={(e) => setToEmail(e.detail.value ?? '')}
                  placeholder="usuario@correo.com"
                />
              </IonItem>
              {toEmail && !validEmail && (
                <p className="zt-muted" style={{ color: 'var(--zt-danger)', margin: '6px 4px' }}>
                  Email inválido.
                </p>
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
                disabled={!canSubmit}
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
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
