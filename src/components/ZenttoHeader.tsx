import {
  IonButtons,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { personCircleOutline } from 'ionicons/icons';

export default function ZenttoHeader({
  title,
  showProfile = true,
}: {
  title: string;
  /** Muestra el avatar que abre el side drawer de configuración. */
  showProfile?: boolean;
}) {
  return (
    <IonHeader className="zt-header">
      <IonToolbar>
        <IonTitle>{title}</IonTitle>
        {showProfile && (
          <IonButtons slot="end">
            {/* Avatar → abre el side drawer de configuración (menu="settings"). */}
            <IonMenuButton menu="settings" autoHide={false} aria-label="Configuración y perfil">
              <IonIcon slot="icon-only" icon={personCircleOutline} />
            </IonMenuButton>
          </IonButtons>
        )}
      </IonToolbar>
    </IonHeader>
  );
}
