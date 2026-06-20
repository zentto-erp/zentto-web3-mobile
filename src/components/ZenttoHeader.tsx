import { IonButtons, IonButton, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/react';
import { personCircleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

export default function ZenttoHeader({
  title,
  showProfile = true,
}: {
  title: string;
  showProfile?: boolean;
}) {
  const history = useHistory();
  return (
    <IonHeader translucent>
      <IonToolbar>
        <IonTitle>{title}</IonTitle>
        {showProfile && (
          <IonButtons slot="end">
            <IonButton onClick={() => history.push('/profile')} aria-label="Perfil">
              <IonIcon slot="icon-only" icon={personCircleOutline} />
            </IonButton>
          </IonButtons>
        )}
      </IonToolbar>
    </IonHeader>
  );
}
