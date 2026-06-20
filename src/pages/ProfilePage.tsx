import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/react';
import {
  logOutOutline,
  mailOutline,
  personCircleOutline,
  shieldCheckmarkOutline,
  shieldOutline,
} from 'ionicons/icons';
import ZenttoHeader from '../components/ZenttoHeader';
import { useAuth } from '../auth/AuthContext';

export default function ProfilePage() {
  const { user, signOut } = useAuth();

  return (
    <IonPage>
      <ZenttoHeader title="Perfil" showProfile={false} />
      <IonContent className="zt-page" fullscreen>
        <div className="zt-screen">
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <IonIcon
              icon={personCircleOutline}
              style={{ fontSize: 88, color: 'var(--zt-indigo)' }}
            />
            <h2 style={{ margin: '8px 0 2px' }}>{user?.displayName || 'Mi cuenta'}</h2>
            <p className="zt-muted">{user?.email}</p>
          </div>

          <div className="zt-card">
            <div className="zt-row">
              <span className="zt-token">
                <IonIcon icon={mailOutline} />
                <span>Correo</span>
              </span>
              <span className="zt-muted">{user?.email}</span>
            </div>
            <div className="zt-row">
              <span className="zt-token">
                <IonIcon
                  icon={user?.totpEnabled ? shieldCheckmarkOutline : shieldOutline}
                  style={{ color: user?.totpEnabled ? 'var(--zt-success)' : 'var(--zt-text-dim)' }}
                />
                <span>Verificación 2FA</span>
              </span>
              <span style={{ color: user?.totpEnabled ? 'var(--zt-success)' : 'var(--zt-text-dim)' }}>
                {user?.totpEnabled ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          </div>

          {!user?.totpEnabled && (
            <div className="zt-banner">
              Activa la verificación en dos pasos desde el backoffice/web para mayor seguridad. La
              gestión de 2FA (setup/enable) se integrará aquí como follow-up.
            </div>
          )}

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
