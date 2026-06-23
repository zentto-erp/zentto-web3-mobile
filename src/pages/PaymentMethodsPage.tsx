import { useState } from 'react';
import PageRefresher from '../components/PageRefresher';
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
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  useIonToast,
} from '@ionic/react';
import {
  addOutline,
  cardOutline,
  closeOutline,
  copyOutline,
  phonePortraitOutline,
  trashOutline,
} from 'ionicons/icons';
import ZenttoHeader from '../components/ZenttoHeader';
import {
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  usePaymentMethods,
} from '../hooks/usePaymentMethods';
import { CardSkeleton } from '../components/Skeletons';
import {
  paymentMethodFields,
  paymentMethodToBlock,
  paymentMethodTypeLabel,
} from '../lib/paymentMethod';
import { VE_BANKS, bankLabel } from '../lib/venezuelanBanks';
import { copyText } from '../lib/clipboard';
import { tapLight, selection, notifySuccess, notifyError } from '../lib/haptics';
import { ApiError } from '../api/client';
import type { PaymentMethodType } from '../api/types';

export default function PaymentMethodsPage() {
  const [present] = useIonToast();
  const list = usePaymentMethods();
  const createMut = useCreatePaymentMethod();
  const deleteMut = useDeletePaymentMethod();

  const [showAdd, setShowAdd] = useState(false);

  async function copy(text: string) {
    const ok = await copyText(text);
    present({ message: ok ? 'Copiado' : 'No se pudo copiar', duration: 1100, color: ok ? 'success' : 'danger' });
  }

  async function onDelete(id: string) {
    tapLight();
    try {
      await deleteMut.mutateAsync(id);
      notifySuccess();
      present({ message: 'Método eliminado', duration: 1400, color: 'success' });
    } catch (err) {
      notifyError();
      const msg = err instanceof ApiError ? err.message : 'No se pudo eliminar';
      present({ message: msg, duration: 2000, color: 'danger' });
    }
  }

  const items = list.data ?? [];

  return (
    <IonPage>
      <ZenttoHeader title="Métodos de cobro" showProfile={false} />
      <IonContent className="zt-page" fullscreen>
        <PageRefresher />
        <div className="zt-screen">
          <p className="zt-muted" style={{ marginTop: 8 }}>
            Guarda tus datos de Pago Móvil o cuenta bancaria. Los podrás adjuntar a tus ofertas P2P
            para que la contraparte los copie sin errores.
          </p>

          <IonButton expand="block" style={{ marginTop: 12 }} onClick={() => { tapLight(); setShowAdd(true); }}>
            <IonIcon slot="start" icon={addOutline} />
            Agregar método
          </IonButton>

          {list.isLoading && !list.data ? (
            <div style={{ marginTop: 4 }}>
              <CardSkeleton lines={2} />
              <CardSkeleton lines={2} />
            </div>
          ) : items.length === 0 ? (
            <div className="zt-empty zt-enter">
              <IonIcon icon={cardOutline} />
              <p>Aún no tienes métodos de cobro. Agrega uno para usarlo en tus ofertas P2P.</p>
            </div>
          ) : (
            <div className="zt-stagger">
            {items.map((m) => (
              <div className="zt-card" key={m.id}>
                <div className="zt-row" style={{ borderBottom: 'none' }}>
                  <span className="zt-token">
                    <IonIcon
                      icon={m.type === 'pago_movil' ? phonePortraitOutline : cardOutline}
                      style={{ color: 'var(--zt-cyan)' }}
                    />
                    <span>
                      <strong style={{ display: 'block' }}>{m.label}</strong>
                      <span className="zt-muted">{paymentMethodTypeLabel(m.type)}</span>
                    </span>
                  </span>
                  <IonButton
                    fill="clear"
                    size="small"
                    color="danger"
                    disabled={deleteMut.isPending}
                    onClick={() => onDelete(m.id)}
                    aria-label="Eliminar"
                  >
                    <IonIcon slot="icon-only" icon={trashOutline} />
                  </IonButton>
                </div>

                {paymentMethodFields(m).map((f) => (
                  <div className="zt-row" key={f.label}>
                    <span className="zt-muted">{f.label}</span>
                    <button
                      type="button"
                      className="zt-link"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      onClick={() => copy(f.value)}
                    >
                      {f.value}
                      <IonIcon icon={copyOutline} />
                    </button>
                  </div>
                ))}

                <IonButton
                  expand="block"
                  fill="outline"
                  size="small"
                  style={{ marginTop: 10 }}
                  onClick={() => {
                    tapLight();
                    copy(paymentMethodToBlock(m));
                  }}
                >
                  <IonIcon slot="start" icon={copyOutline} />
                  Copiar todo
                </IonButton>
              </div>
            ))}
            </div>
          )}
        </div>

        <AddPaymentMethodModal
          isOpen={showAdd}
          onDismiss={() => setShowAdd(false)}
          onCreate={async (input) => {
            try {
              await createMut.mutateAsync(input);
              notifySuccess();
              present({ message: 'Método agregado', duration: 1400, color: 'success' });
              setShowAdd(false);
            } catch (err) {
              notifyError();
              const msg = err instanceof ApiError ? err.message : 'No se pudo guardar';
              present({ message: msg, duration: 2200, color: 'danger' });
            }
          }}
          saving={createMut.isPending}
        />
      </IonContent>
    </IonPage>
  );
}

interface AddInput {
  type: PaymentMethodType;
  label: string;
  bankName?: string;
  accountHolder?: string;
  idNumber?: string;
  phone?: string;
  accountNumber?: string;
}

function AddPaymentMethodModal({
  isOpen,
  onDismiss,
  onCreate,
  saving,
}: {
  isOpen: boolean;
  onDismiss: () => void;
  onCreate: (input: AddInput) => void;
  saving: boolean;
}) {
  const [type, setType] = useState<PaymentMethodType>('pago_movil');
  const [label, setLabel] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const valid =
    label.trim().length >= 2 &&
    (type === 'pago_movil' ? phone.trim().length > 0 : accountNumber.trim().length > 0);

  function submit() {
    if (!valid) return;
    onCreate({
      type,
      label: label.trim(),
      bankName: bankName.trim() || undefined,
      accountHolder: accountHolder.trim() || undefined,
      idNumber: idNumber.trim() || undefined,
      phone: type === 'pago_movil' ? phone.trim() || undefined : undefined,
      accountNumber: type === 'bank_account' ? accountNumber.trim() || undefined : undefined,
    });
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} className="zt-modal">
      <IonHeader className="zt-header">
        <IonToolbar>
          <IonTitle>Agregar método</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDismiss} aria-label="Cerrar">
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="zt-page">
        <div className="zt-screen">
          <IonSegment
            value={type}
            onIonChange={(e) => {
              selection();
              setType((e.detail.value as PaymentMethodType) ?? 'pago_movil');
            }}
          >
            <IonSegmentButton value="pago_movil">
              <IonLabel>Pago Móvil</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="bank_account">
              <IonLabel>Cuenta bancaria</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          <IonItem className="zt-card" lines="none" style={{ marginTop: 12 }}>
            <IonInput
              label="Etiqueta"
              labelPlacement="stacked"
              value={label}
              onIonInput={(e) => setLabel(e.detail.value ?? '')}
              placeholder="Ej: Mi Pago Móvil"
            />
          </IonItem>

          <IonItem className="zt-card" lines="none">
            <IonSelect
              label="Banco"
              labelPlacement="stacked"
              value={bankName}
              onIonChange={(e) => setBankName(e.detail.value ?? '')}
              placeholder="Selecciona tu banco"
              interface="popover"
            >
              {VE_BANKS.map((b) => (
                <IonSelectOption key={b.code} value={b.name}>
                  {bankLabel(b)}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>

          {type === 'pago_movil' ? (
            <IonItem className="zt-card" lines="none">
              <IonInput
                label="Teléfono"
                labelPlacement="stacked"
                inputmode="tel"
                value={phone}
                onIonInput={(e) => setPhone(e.detail.value ?? '')}
                placeholder="0414-1234567"
              />
            </IonItem>
          ) : (
            <IonItem className="zt-card" lines="none">
              <IonInput
                label="Nro. de cuenta"
                labelPlacement="stacked"
                inputmode="numeric"
                value={accountNumber}
                onIonInput={(e) => setAccountNumber(e.detail.value ?? '')}
                placeholder="0102-0000-00-0000000000"
              />
            </IonItem>
          )}

          <IonItem className="zt-card" lines="none">
            <IonInput
              label="Cédula / RIF"
              labelPlacement="stacked"
              value={idNumber}
              onIonInput={(e) => setIdNumber(e.detail.value ?? '')}
              placeholder="V-7786676"
            />
          </IonItem>

          <IonItem className="zt-card" lines="none">
            <IonInput
              label="Titular"
              labelPlacement="stacked"
              value={accountHolder}
              onIonInput={(e) => setAccountHolder(e.detail.value ?? '')}
              placeholder="Nombre del titular"
            />
          </IonItem>

          <IonButton expand="block" style={{ marginTop: 14 }} disabled={!valid || saving} onClick={submit}>
            {saving ? 'Guardando…' : 'Guardar método'}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
}
