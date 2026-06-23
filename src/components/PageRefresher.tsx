import { IonRefresher, IonRefresherContent } from '@ionic/react';
import { useQueryClient } from '@tanstack/react-query';

import { tapLight } from '../lib/haptics';

/** Pull-to-refresh estándar: recarga todas las queries de React Query. */
export default function PageRefresher() {
  const qc = useQueryClient();
  return (
    <IonRefresher
      slot="fixed"
      onIonRefresh={(e) => {
        tapLight();
        qc.invalidateQueries().finally(() => e.detail.complete());
      }}
    >
      <IonRefresherContent />
    </IonRefresher>
  );
}
