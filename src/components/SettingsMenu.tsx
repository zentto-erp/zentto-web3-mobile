import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonNote,
  IonToolbar,
} from '@ionic/react';
import {
  chevronForwardOutline,
  fingerPrintOutline,
  globeOutline,
  logOutOutline,
  mailOutline,
  personCircleOutline,
  shieldCheckmarkOutline,
  shieldOutline,
  cardOutline,
  lockClosedOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useKycStatus } from '../hooks/useKyc';
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

/**
 * Side drawer de configuración (perfil + verificación + seguridad + idioma + logout).
 * Se abre desde el avatar del header (IonMenuButton menu="settings").
 * No toca lógica de API: solo navega a rutas existentes o llama signOut().
 */
export default function SettingsMenu() {
  const history = useHistory();
  const { user, signOut } = useAuth();
  const kyc = useKycStatus();

  const kStatus = (kyc.data?.status ?? 'not_started') as KycStatus;
  const k = kycLabel(kStatus);

  const initials = (user?.displayName || user?.email || '?')
    .trim()
    .charAt(0)
    .toUpperCase();

  function go(path: string) {
    history.push(path);
  }

  return (
    <IonMenu menuId="settings" contentId="main" side="end" type="overlay" className="zt-menu">
      <IonHeader>
        <IonToolbar>
          {/* Cabecera de perfil */}
          <div className="zt-menu-profile">
            <div className="zt-menu-avatar">{initials}</div>
            <div className="zt-menu-id">
              <div className="zt-menu-name">{user?.displayName || 'Mi cuenta'}</div>
              <div className="zt-menu-email">{user?.email}</div>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="zt-menu-content">
        <IonList lines="full" className="zt-menu-list">
          <IonListHeader>
            <IonLabel>Cuenta</IonLabel>
          </IonListHeader>

          <IonMenuToggle autoHide={false}>
            <IonItem button detail={false} onClick={() => go('/profile')}>
              <IonIcon slot="start" icon={personCircleOutline} color="primary" />
              <IonLabel>Perfil</IonLabel>
              <IonIcon slot="end" icon={chevronForwardOutline} className="zt-menu-chevron" />
            </IonItem>
          </IonMenuToggle>

          <IonMenuToggle autoHide={false}>
            <IonItem button detail={false} onClick={() => go('/payment-methods')}>
              <IonIcon slot="start" icon={cardOutline} color="primary" />
              <IonLabel>Métodos de cobro</IonLabel>
              <IonIcon slot="end" icon={chevronForwardOutline} className="zt-menu-chevron" />
            </IonItem>
          </IonMenuToggle>

          <IonItem lines="full">
            <IonIcon slot="start" icon={mailOutline} className="zt-menu-icon-dim" />
            <IonLabel>Correo</IonLabel>
            <IonNote slot="end" className="zt-menu-note">
              {user?.email}
            </IonNote>
          </IonItem>
        </IonList>

        <IonList lines="full" className="zt-menu-list">
          <IonListHeader>
            <IonLabel>Verificación y seguridad</IonLabel>
          </IonListHeader>

          <IonMenuToggle autoHide={false}>
            <IonItem button detail={false} onClick={() => go('/kyc')}>
              <IonIcon slot="start" icon={fingerPrintOutline} color="primary" />
              <IonLabel>Verificación KYC</IonLabel>
              <IonNote slot="end" style={{ color: k.color }}>
                {k.label}
              </IonNote>
            </IonItem>
          </IonMenuToggle>

          <IonMenuToggle autoHide={false}>
            <IonItem button detail={false} onClick={() => go('/security')}>
              <IonIcon
                slot="start"
                icon={user?.totpEnabled ? shieldCheckmarkOutline : shieldOutline}
                style={{ color: user?.totpEnabled ? 'var(--zt-success)' : 'var(--zt-text-dim)' }}
              />
              <IonLabel>Seguridad · 2FA</IonLabel>
              <IonNote
                slot="end"
                style={{ color: user?.totpEnabled ? 'var(--zt-success)' : 'var(--zt-text-dim)' }}
              >
                {user?.totpEnabled ? 'Activa' : 'Inactiva'}
              </IonNote>
            </IonItem>
          </IonMenuToggle>

          <IonMenuToggle autoHide={false}>
            <IonItem button detail={false} onClick={() => go('/app-security')}>
              <IonIcon slot="start" icon={lockClosedOutline} color="primary" />
              <IonLabel>Bloqueo de la app</IonLabel>
              <IonIcon slot="end" icon={chevronForwardOutline} className="zt-menu-chevron" />
            </IonItem>
          </IonMenuToggle>
        </IonList>

        <IonList lines="full" className="zt-menu-list">
          <IonListHeader>
            <IonLabel>Preferencias</IonLabel>
          </IonListHeader>

          {/* "Explorar red" oculto: la exploración on-chain es interna (custodial);
              el usuario no necesita ver la cadena. */}

          <IonItem detail={false}>
            <IonIcon slot="start" icon={globeOutline} className="zt-menu-icon-dim" />
            <IonLabel>Idioma</IonLabel>
            <IonNote slot="end" className="zt-menu-note">
              Español
            </IonNote>
          </IonItem>
        </IonList>

        <IonList lines="full" className="zt-menu-list">
          <IonListHeader>
            <IonLabel>Legal</IonLabel>
          </IonListHeader>

          <IonMenuToggle autoHide={false}>
            <IonItem button detail={false} onClick={() => go('/legal/terminos')}>
              <IonIcon slot="start" icon={documentTextOutline} className="zt-menu-icon-dim" />
              <IonLabel>Términos y Condiciones</IonLabel>
              <IonIcon slot="end" icon={chevronForwardOutline} className="zt-menu-chevron" />
            </IonItem>
          </IonMenuToggle>

          <IonMenuToggle autoHide={false}>
            <IonItem button detail={false} onClick={() => go('/legal/privacidad')}>
              <IonIcon slot="start" icon={documentTextOutline} className="zt-menu-icon-dim" />
              <IonLabel>Política de Privacidad</IonLabel>
              <IonIcon slot="end" icon={chevronForwardOutline} className="zt-menu-chevron" />
            </IonItem>
          </IonMenuToggle>

          <IonMenuToggle autoHide={false}>
            <IonItem button detail={false} onClick={() => go('/legal/responsabilidad')}>
              <IonIcon slot="start" icon={documentTextOutline} className="zt-menu-icon-dim" />
              <IonLabel>Aviso de Responsabilidad</IonLabel>
              <IonIcon slot="end" icon={chevronForwardOutline} className="zt-menu-chevron" />
            </IonItem>
          </IonMenuToggle>
        </IonList>

        <div className="zt-menu-footer">
          <IonMenuToggle autoHide={false}>
            <IonItem
              button
              detail={false}
              lines="none"
              className="zt-menu-logout"
              onClick={() => void signOut()}
            >
              <IonIcon slot="start" icon={logOutOutline} color="danger" />
              <IonLabel color="danger">Cerrar sesión</IonLabel>
            </IonItem>
          </IonMenuToggle>
        </div>
      </IonContent>
    </IonMenu>
  );
}
