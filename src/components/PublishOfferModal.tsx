import { useMemo, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  useIonToast,
} from '@ionic/react';
import { closeOutline, trendingUpOutline } from 'ionicons/icons';
import { useAccountBalance } from '../hooks/usePayments';
import { useCreateP2pOrder, useMarketRate } from '../hooks/useP2p';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { paymentMethodPublicLabel, paymentMethodToText } from '../lib/paymentMethod';
import { formatAmount, formatVes } from '../lib/format';
import { ApiError } from '../api/client';
import type { P2pSide } from '../api/types';

const ASSETS = ['USDT', 'USDC'];
const DECIMAL_RE = /^\d+(\.\d+)?$/;

/**
 * Modal para publicar una oferta P2P. Vender escrowa tu cripto; el método de pago
 * se elige de los guardados (o texto libre) y se manda como texto legible para que
 * la contraparte lo copie.
 */
export default function PublishOfferModal({
  isOpen,
  onDismiss,
  onPublished,
}: {
  isOpen: boolean;
  onDismiss: () => void;
  onPublished: () => void;
}) {
  const [present] = useIonToast();
  const createMut = useCreateP2pOrder();
  const methods = usePaymentMethods();
  const balance = useAccountBalance();
  const market = useMarketRate();

  const [side, setSide] = useState<P2pSide>('sell');
  const [asset, setAsset] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [priceVes, setPriceVes] = useState('');
  const [methodId, setMethodId] = useState<string>('');
  const [customMethod, setCustomMethod] = useState('');

  const balances = balance.data ?? [];
  const assetBal = balances.find((b) => b.asset?.toUpperCase() === asset);
  const available = Number(assetBal?.available ?? '0');

  const amountNum = Number(amount);
  const priceNum = Number(priceVes);

  const validAmount = DECIMAL_RE.test(amount.trim()) && amountNum > 0;
  const validPrice = DECIMAL_RE.test(priceVes.trim()) && priceNum > 0;
  // Vender escrowa: el monto no puede superar el disponible.
  const overBalance = side === 'sell' && amountNum > available;

  // Banda anti-especulación: el precio debe estar dentro del rango de mercado.
  const rate = market.data;
  const hasBand = !!rate && rate.min !== null && rate.max !== null;
  const outOfBand =
    hasBand && validPrice && (priceNum < (rate.min as number) || priceNum > (rate.max as number));

  const selectedMethod = useMemo(
    () => (methods.data ?? []).find((m) => m.id === methodId),
    [methods.data, methodId],
  );

  // Etiqueta PÚBLICA (visible en el libro) vs. datos COMPLETOS (revelados al tomar).
  const paymentLabel =
    methodId === '__custom__'
      ? customMethod.trim().split('·')[0].slice(0, 60).trim()
      : selectedMethod
        ? paymentMethodPublicLabel(selectedMethod)
        : '';
  const paymentDetails =
    methodId === '__custom__'
      ? customMethod.trim()
      : selectedMethod
        ? paymentMethodToText(selectedMethod)
        : '';

  const total = amountNum > 0 && priceNum > 0 ? amountNum * priceNum : 0;
  const canPublish =
    validAmount && validPrice && !overBalance && !outOfBand && !createMut.isPending;

  function reset() {
    setAmount('');
    setPriceVes('');
    setMethodId('');
    setCustomMethod('');
  }

  async function handlePublish() {
    if (!canPublish) return;
    try {
      await createMut.mutateAsync({
        side,
        asset,
        amount: amount.trim(),
        priceVes: priceVes.trim(),
        paymentMethod: paymentLabel || undefined,
        paymentDetails: paymentDetails || undefined,
      });
      present({ message: 'Oferta publicada', duration: 1600, color: 'success' });
      reset();
      onPublished();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo publicar la oferta';
      present({ message: msg, duration: 2600, color: 'danger' });
    }
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} className="zt-modal">
      <IonHeader className="zt-header">
        <IonToolbar>
          <IonTitle>Publicar oferta</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDismiss} aria-label="Cerrar">
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="zt-page">
        <div className="zt-screen">
          <IonSegment value={side} onIonChange={(e) => setSide((e.detail.value as P2pSide) ?? 'sell')}>
            <IonSegmentButton value="sell">
              <IonLabel>Vender</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="buy">
              <IonLabel>Comprar</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          <p className="zt-muted" style={{ marginTop: 12 }}>
            {side === 'sell'
              ? 'Vendes cripto a cambio de bolívares. Tu cripto queda retenido hasta cerrar el trade.'
              : 'Compras cripto pagando bolívares. La contraparte retiene su cripto.'}
          </p>

          <IonItem className="zt-card" lines="none">
            <IonSelect
              label="Activo"
              labelPlacement="stacked"
              value={asset}
              onIonChange={(e) => setAsset(e.detail.value)}
              interface="popover"
            >
              {ASSETS.map((a) => (
                <IonSelectOption key={a} value={a}>
                  {a}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>

          <IonItem className="zt-card" lines="none">
            <IonInput
              label={`Cantidad (${asset})`}
              labelPlacement="stacked"
              type="number"
              inputmode="decimal"
              value={amount}
              onIonInput={(e) => setAmount(e.detail.value ?? '')}
              placeholder="0.00"
            />
          </IonItem>
          {side === 'sell' && (
            <div className="zt-row" style={{ borderBottom: 'none', padding: '6px 4px 0' }}>
              <span className="zt-muted">Disponible</span>
              <button
                type="button"
                className="zt-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setAmount(assetBal?.available ?? '')}
              >
                {formatAmount(assetBal?.available ?? '0', 6)} {asset}
              </button>
            </div>
          )}
          {overBalance && (
            <p className="zt-muted" style={{ color: 'var(--zt-danger)', margin: '6px 4px' }}>
              El monto supera tu saldo disponible.
            </p>
          )}

          {rate?.usdtVes != null && (
            <div
              className="zt-row"
              style={{ borderBottom: 'none', padding: '10px 4px 0', alignItems: 'center' }}
            >
              <span className="zt-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <IonIcon icon={trendingUpOutline} style={{ color: 'var(--zt-cyan)' }} />
                Mercado USDT/Bs.
              </span>
              <button
                type="button"
                className="zt-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setPriceVes(String(Math.round((rate.usdtVes as number) * 100) / 100))}
              >
                {formatVes(rate.usdtVes)} · usar
              </button>
            </div>
          )}

          <IonItem className="zt-card" lines="none">
            <IonInput
              label="Precio por unidad (Bs.)"
              labelPlacement="stacked"
              type="number"
              inputmode="decimal"
              value={priceVes}
              onIonInput={(e) => setPriceVes(e.detail.value ?? '')}
              placeholder="0.00"
            />
          </IonItem>
          {hasBand && (
            <p
              className="zt-muted"
              style={{ color: outOfBand ? 'var(--zt-danger)' : 'var(--zt-text-dim)', margin: '6px 4px' }}
            >
              {outOfBand
                ? `Precio fuera de rango. Permitido entre ${formatVes(rate!.min)} y ${formatVes(rate!.max)} para evitar especulación.`
                : `Rango permitido: ${formatVes(rate!.min)} – ${formatVes(rate!.max)} (±${Math.round(rate!.bandPct * 100)}%).`}
            </p>
          )}

          <IonItem className="zt-card" lines="none">
            <IonSelect
              label="Método de pago"
              labelPlacement="stacked"
              value={methodId}
              onIonChange={(e) => setMethodId(e.detail.value)}
              interface="popover"
              placeholder="Selecciona"
            >
              {(methods.data ?? []).map((m) => (
                <IonSelectOption key={m.id} value={m.id}>
                  {m.label}
                </IonSelectOption>
              ))}
              <IonSelectOption value="__custom__">Otro (escribir)</IonSelectOption>
            </IonSelect>
          </IonItem>

          {methodId === '__custom__' && (
            <IonItem className="zt-card" lines="none">
              <IonInput
                label="Descripción del pago"
                labelPlacement="stacked"
                value={customMethod}
                onIonInput={(e) => setCustomMethod(e.detail.value ?? '')}
                placeholder="Ej: Pago Móvil 0414… BDV"
              />
            </IonItem>
          )}

          {paymentLabel && (
            <div className="zt-card">
              <h3>En el mercado se verá</h3>
              <p className="zt-mono">{paymentLabel}</p>
              <p className="zt-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                🔒 Tus datos completos (cuenta/teléfono) solo se revelan a la contraparte
                cuando acepte la operación.
              </p>
            </div>
          )}

          {total > 0 && (
            <div className="zt-row" style={{ marginTop: 8 }}>
              <span className="zt-muted">Total de la oferta</span>
              <strong>{formatVes(total)}</strong>
            </div>
          )}

          <IonButton expand="block" style={{ marginTop: 14 }} disabled={!canPublish} onClick={handlePublish}>
            {createMut.isPending ? 'Publicando…' : 'Publicar oferta'}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
}
