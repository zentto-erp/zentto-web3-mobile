import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonSpinner,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import {
  homeOutline,
  paperPlaneOutline,
  qrCodeOutline,
  swapHorizontalOutline,
  compassOutline,
} from 'ionicons/icons';

import { useAuth } from './auth/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import SendPage from './pages/SendPage';
import ReceivePage from './pages/ReceivePage';
import MovementsPage from './pages/MovementsPage';
import ExplorePage from './pages/ExplorePage';
import ProfilePage from './pages/ProfilePage';

function FullScreenLoader() {
  return (
    <div
      style={{
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--zt-bg)',
      }}
    >
      <IonSpinner name="crescent" color="primary" />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <IonApp>
        <FullScreenLoader />
      </IonApp>
    );
  }

  // Sin sesión → flujo de auth.
  if (!user) {
    return (
      <IonApp>
        <IonReactRouter>
          <IonRouterOutlet>
            <Route exact path="/login" component={LoginPage} />
            <Route exact path="/register" component={RegisterPage} />
            <Route render={() => <Redirect to="/login" />} />
          </IonRouterOutlet>
        </IonReactRouter>
      </IonApp>
    );
  }

  // Con sesión → app con bottom tabs.
  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/home" component={HomePage} />
            <Route exact path="/send" component={SendPage} />
            <Route exact path="/receive" component={ReceivePage} />
            <Route exact path="/movements" component={MovementsPage} />
            <Route exact path="/explore" component={ExplorePage} />
            <Route exact path="/profile" component={ProfilePage} />
            <Route exact path="/login" render={() => <Redirect to="/home" />} />
            <Route exact path="/register" render={() => <Redirect to="/home" />} />
            <Route render={() => <Redirect to="/home" />} />
          </IonRouterOutlet>

          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/home">
              <IonIcon icon={homeOutline} />
              <IonLabel>Inicio</IonLabel>
            </IonTabButton>
            <IonTabButton tab="send" href="/send">
              <IonIcon icon={paperPlaneOutline} />
              <IonLabel>Enviar</IonLabel>
            </IonTabButton>
            <IonTabButton tab="receive" href="/receive">
              <IonIcon icon={qrCodeOutline} />
              <IonLabel>Recibir</IonLabel>
            </IonTabButton>
            <IonTabButton tab="movements" href="/movements">
              <IonIcon icon={swapHorizontalOutline} />
              <IonLabel>Movimientos</IonLabel>
            </IonTabButton>
            <IonTabButton tab="explore" href="/explore">
              <IonIcon icon={compassOutline} />
              <IonLabel>Explorar</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
}
