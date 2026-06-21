import { useState } from 'react';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  useIonToast,
} from '@ionic/react';
import {
  shieldCheckmarkOutline,
  checkmarkCircle,
  closeCircle,
  timeOutline,
  documentTextOutline,
  refreshOutline,
} from 'ionicons/icons';
import ZenttoHeader from '../components/ZenttoHeader';
import ImageCapture from '../components/ImageCapture';
import { useKycStatus, useVerifyDocuments } from '../hooks/useKyc';
import { tapLight, notifySuccess, notifyError, notifyWarning } from '../lib/haptics';
import { ApiError } from '../api/client';
import type { CapturedImage } from '../lib/capture';
import type { KycStatus } from '../api/types';

const STATUS_META: Record<string, { label: string; color: string; icon: string; msg: string }> = {
  not_started: {
    label: 'Sin iniciar',
    color: 'var(--zt-text-dim)',
    icon: documentTextOutline,
    msg: 'Verifica tu identidad capturando tu documento y una selfie desde la app.',
  },
  pending: {
    label: 'Pendiente',
    color: 'var(--zt-warning)',
    icon: timeOutline,
    msg: 'Tu verificación está en proceso; desliza hacia abajo para actualizar.',
  },
  in_review: {
    label: 'En revisión',
    color: 'var(--zt-warning)',
    icon: timeOutline,
    msg: 'Estamos revisando tu verificación. Desliza hacia abajo para actualizar.',
  },
  approved: {
    label: 'Aprobada',
    color: 'var(--zt-success)',
    icon: checkmarkCircle,
    msg: 'Tu identidad está verificada. Ya puedes operar sin límites de KYC.',
  },
  rejected: {
    label: 'Rechazada',
    color: 'var(--zt-danger)',
    icon: closeCircle,
    msg: 'Tu verificación fue rechazada. Revisa el motivo y vuelve a intentarlo.',
  },
};

function meta(status: KycStatus) {
  return STATUS_META[status] ?? STATUS_META.not_started;
}

export default function KycPage() {
  const [present] = useIonToast();
  const statusQ = useKycStatus();
  const verifyMut = useVerifyDocuments();

  const [fullName, setFullName] = useState('');
  const [front, setFront] = useState<CapturedImage | null>(null);
  const [back, setBack] = useState<CapturedImage | null>(null);
  const [selfie, setSelfie] = useState<CapturedImage | null>(null);

  const status = statusQ.data?.status ?? 'not_started';
  const m = meta(status);
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const inProgress = status === 'pending' || status === 'in_review';
  const canSubmit = !!front && !verifyMut.isPending && !isApproved;

  async function submit() {
    if (!front) {
      notifyWarning();
      present({ message: 'El documento (frente) es obligatorio', duration: 1800, color: 'warning' });
      return;
    }
    tapLight();
    try {
      const res = await verifyMut.mutateAsync({
        front: front.blob,
        back: back?.blob ?? null,
        selfie: selfie?.blob ?? null,
        fullName: fullName.trim() || undefined,
      });
      const rm = meta(res.status);
      if (res.status === 'approved') notifySuccess();
      else if (res.status === 'rejected') notifyError();
      else notifyWarning();
      present({
        message: `Verificación: ${rm.label}`,
        duration: 2400,
        color:
          res.status === 'approved' ? 'success' : res.status === 'rejected' ? 'danger' : 'warning',
      });
    } catch (err) {
      notifyError();
      const msg = err instanceof ApiError ? err.message : 'No se pudo enviar la verificación';
      present({ message: msg, duration: 2600, color: 'danger' });
    }
  }

  return (
    <IonPage>
      <ZenttoHeader title="Verificar identidad" />
      <IonContent className="zt-page" fullscreen>
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (e) => {
            await statusQ.refetch();
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>
        <div className="zt-screen">
          {/* Estado actual */}
          <div className="zt-card" style={{ marginTop: 8 }}>
            <div className="zt-row" style={{ borderBottom: 'none' }}>
              <span className="zt-token">
                <IonIcon icon={shieldCheckmarkOutline} style={{ color: 'var(--zt-indigo)' }} />
                <span>Estado KYC</span>
              </span>
              {statusQ.isLoading ? (
                <IonSpinner name="dots" />
              ) : (
                <span className="zt-status-chip" style={{ color: m.color }}>
                  <IonIcon icon={m.icon} style={{ marginRight: 4 }} />
                  {m.label}
                </span>
              )}
            </div>
            <p className="zt-muted" style={{ margin: '6px 0 0' }}>
              {isApproved ? '✅ ' : ''}
              {m.msg}
            </p>
            {isRejected && statusQ.data?.decisionReason && (
              <p className="zt-muted" style={{ color: 'var(--zt-danger)', margin: '6px 0 0' }}>
                Motivo: {statusQ.data.decisionReason}
              </p>
            )}
            {statusQ.data?.amlMatch && (
              <p className="zt-muted" style={{ color: 'var(--zt-warning)', margin: '6px 0 0' }}>
                Coincidencia en screening AML: revisión manual requerida.
              </p>
            )}
          </div>

          {isApproved ? (
            <div
              className="zt-banner"
              style={{
                background: 'rgba(52,211,153,0.12)',
                borderColor: 'rgba(52,211,153,0.35)',
                color: '#a7f3d0',
              }}
            >
              ✅ Tu identidad ya está verificada. No necesitas hacer nada más.
            </div>
          ) : (
            // ─────────── Captura NATIVA (cámara en la app) ───────────
            <>
              {inProgress && (
                <div
                  className="zt-banner"
                  style={{
                    background: 'rgba(251,191,36,0.10)',
                    borderColor: 'rgba(251,191,36,0.30)',
                    color: 'var(--zt-warning)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <span>Tu verificación está en proceso. Puedes actualizar o volver a enviarla.</span>
                  <IonButton fill="clear" size="small" onClick={() => statusQ.refetch()}>
                    <IonIcon slot="icon-only" icon={refreshOutline} />
                  </IonButton>
                </div>
              )}
              <p className="zt-muted" style={{ marginTop: 16 }}>
                Toma una foto de tu documento de identidad y una selfie. Todo se procesa de forma
                segura en la app; no salimos a ningún sitio externo.
              </p>

              <IonItem className="zt-card" lines="none" style={{ marginTop: 12 }}>
                <IonInput
                  label="Nombre completo (opcional)"
                  labelPlacement="stacked"
                  value={fullName}
                  onIonInput={(e) => setFullName(e.detail.value ?? '')}
                  placeholder="Como aparece en tu documento"
                />
              </IonItem>

              <ImageCapture
                label="Documento (frente)"
                required
                hint="Foto nítida del frente de tu cédula/pasaporte."
                value={front}
                onChange={setFront}
              />
              <ImageCapture
                label="Documento (dorso)"
                hint="Opcional — reverso del documento."
                value={back}
                onChange={setBack}
              />
              <ImageCapture
                label="Selfie"
                hint="Recomendado — habilita prueba de vida y comparación facial."
                value={selfie}
                onChange={setSelfie}
              />

              <IonButton
                expand="block"
                style={{ marginTop: 16 }}
                disabled={!canSubmit}
                onClick={submit}
              >
                <IonIcon slot="start" icon={shieldCheckmarkOutline} />
                {verifyMut.isPending
                  ? 'Verificando…'
                  : isRejected
                    ? 'Reintentar verificación'
                    : 'Verificar mi identidad'}
              </IonButton>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
