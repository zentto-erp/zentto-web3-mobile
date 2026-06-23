import { useEffect, useState } from 'react';
import PageRefresher from '../components/PageRefresher';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonPage,
  useIonToast,
} from '@ionic/react';
import {
  logOutOutline,
  mailOutline,
  personCircleOutline,
  shieldCheckmarkOutline,
  shieldOutline,
  fingerPrintOutline,
  chevronForwardOutline,
  callOutline,
  saveOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import ZenttoHeader from '../components/ZenttoHeader';
import { useAuth } from '../auth/AuthContext';
import { useKycStatus } from '../hooks/useKyc';
import { useUpdateMe } from '../hooks/useUsers';
import { ApiError } from '../api/client';
import { tapLight, notifySuccess, notifyError } from '../lib/haptics';
import type { KycStatus } from '../api/types';

const KYC_LABEL: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Sin verificar', color: 'var(--zt-text-dim)' },
  pending: { label: 'En progreso', color: 'var(--zt-warning)' },
  in_review: { label: 'En revisión', color: 'var(--zt-warning)' },
  approved: { label: 'Verificada', color: 'var(--zt-success)' },
  rejected: { label: 'Rechazada', color: 'var(--zt-danger)' },
};

function kycLabel(status: KycStatus) {
  return KYC_LABEL[status] ?? KYC_LABEL.not_started;
}

export default function ProfilePage() {
  const history = useHistory();
  const [present] = useIonToast();
  const { user, setUser, signOut } = useAuth();
  const kyc = useKycStatus();
  const updateMut = useUpdateMe();

  const kStatus = kyc.data?.status ?? 'not_started';
  const k = kycLabel(kStatus);
  const kycPending = kStatus !== 'approved';

  // Edición de perfil (nombre + teléfono).
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
    setPhone(user?.phone ?? '');
  }, [user?.displayName, user?.phone]);

  const dirty =
    displayName.trim() !== (user?.displayName ?? '') ||
    phone.trim() !== (user?.phone ?? '');
  const canSave = dirty && !updateMut.isPending;

  async function handleSaveProfile() {
    if (!canSave) return;
    tapLight();
    try {
      const updated = await updateMut.mutateAsync({
        displayName: displayName.trim(),
        phone: phone.trim(),
      });
      setUser(updated);
      notifySuccess();
      present({ message: 'Perfil actualizado', duration: 1600, color: 'success' });
    } catch (err) {
      notifyError();
      const msg = err instanceof ApiError ? err.message : 'No se pudo guardar el perfil';
      present({ message: msg, duration: 2400, color: 'danger' });
    }
  }

  return (
    <IonPage>
      <ZenttoHeader title="Perfil" showProfile={false} />
      <IonContent className="zt-page" fullscreen>
        <PageRefresher />
        <div className="zt-screen">
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <IonIcon
              icon={personCircleOutline}
              style={{ fontSize: 88, color: 'var(--zt-indigo)' }}
            />
            <h2 style={{ margin: '8px 0 2px' }}>{user?.displayName || 'Mi cuenta'}</h2>
            <p className="zt-muted">{user?.email}</p>
          </div>

          {/* Banner KYC si no está aprobado */}
          {kycPending && (
            <div className="zt-banner">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IonIcon icon={fingerPrintOutline} />
                Verifica tu identidad para operar sin límites.
              </span>
              <IonButton
                fill="clear"
                size="small"
                style={{ marginTop: 6 }}
                onClick={() => history.push('/kyc')}
              >
                Verificar ahora
              </IonButton>
            </div>
          )}

          <div className="zt-card">
            <div className="zt-row">
              <span className="zt-token">
                <IonIcon icon={mailOutline} />
                <span>Correo</span>
              </span>
              <span className="zt-muted">{user?.email}</span>
            </div>

            {/* Verificar identidad (KYC) */}
            <button
              type="button"
              className="zt-row"
              onClick={() => history.push('/kyc')}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <span className="zt-token">
                <IonIcon icon={fingerPrintOutline} style={{ color: 'var(--zt-indigo)' }} />
                <span>Verificar identidad</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: k.color }}>
                {k.label}
                <IonIcon icon={chevronForwardOutline} style={{ color: 'var(--zt-text-dim)' }} />
              </span>
            </button>

            {/* Seguridad / 2FA */}
            <button
              type="button"
              className="zt-row"
              onClick={() => history.push('/security')}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <span className="zt-token">
                <IonIcon
                  icon={user?.totpEnabled ? shieldCheckmarkOutline : shieldOutline}
                  style={{ color: user?.totpEnabled ? 'var(--zt-success)' : 'var(--zt-text-dim)' }}
                />
                <span>Seguridad · 2FA</span>
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: user?.totpEnabled ? 'var(--zt-success)' : 'var(--zt-text-dim)',
                }}
              >
                {user?.totpEnabled ? 'Activa' : 'Inactiva'}
                <IonIcon icon={chevronForwardOutline} style={{ color: 'var(--zt-text-dim)' }} />
              </span>
            </button>
          </div>

          {/* Editar perfil — nombre y teléfono (para que te encuentren al enviar) */}
          <div className="zt-card">
            <h3>Datos personales</h3>
            <p className="zt-muted" style={{ margin: '0 0 4px' }}>
              Agrega tu teléfono para que otros usuarios puedan encontrarte al enviarte dinero.
            </p>

            <div className="zt-field-label">Nombre</div>
            <IonItem className="zt-card" lines="none" style={{ marginTop: 0 }}>
              <IonInput
                aria-label="Nombre"
                value={displayName}
                onIonInput={(e) => setDisplayName(e.detail.value ?? '')}
                placeholder="Tu nombre"
                maxlength={80}
              />
            </IonItem>

            <div className="zt-field-label">Teléfono</div>
            <IonItem className="zt-card" lines="none" style={{ marginTop: 0 }}>
              <IonIcon
                slot="start"
                icon={callOutline}
                style={{ color: 'var(--zt-text-dim)', fontSize: 18 }}
              />
              <IonInput
                aria-label="Teléfono"
                type="tel"
                inputmode="tel"
                value={phone}
                onIonInput={(e) => setPhone(e.detail.value ?? '')}
                placeholder="+58 412 000 0000"
                maxlength={24}
              />
            </IonItem>

            <IonButton
              expand="block"
              style={{ marginTop: 16 }}
              disabled={!canSave}
              onClick={handleSaveProfile}
            >
              <IonIcon slot="start" icon={saveOutline} />
              {updateMut.isPending ? 'Guardando…' : 'Guardar cambios'}
            </IonButton>
          </div>

          <IonButton
            expand="block"
            color="danger"
            fill="outline"
            style={{ marginTop: 18 }}
            onClick={signOut}
          >
            <IonIcon slot="start" icon={logOutOutline} />
            Cerrar sesión
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}
