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
  timeOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';

import SettingsMenu from './components/SettingsMenu';
import LockScreen from './components/LockScreen';
import { useAuth } from './auth/AuthContext';
import { useIncomingNotifications } from './hooks/useIncomingNotifications';
import { useLock } from './auth/LockContext';
import { selection } from './lib/haptics';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import SendPage from './pages/SendPage';
import ReceivePage from './pages/ReceivePage';
import MovementsPage from './pages/MovementsPage';
import ExplorePage from './pages/ExplorePage';
import ProfilePage from './pages/ProfilePage';
import KycPage from './pages/KycPage';
import SecurityPage from './pages/SecurityPage';
import P2pPage from './pages/P2pPage';
import TradeDetailPage from './pages/TradeDetailPage';
import RechargePage from './pages/RechargePage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import AppSecurityPage from './pages/AppSecurityPage';
import LegalPage from './pages/LegalPage';

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

/** Vigila el historial y dispara notificaciones locales al recibir dinero. */
function NotificationsWatcher() {
  useIncomingNotifications();
  return null;
}

export default function App() {
  const { user, loading } = useAuth();
  const { locked } = useLock();

  if (loading) {
    return (
      <IonApp>
        <FullScreenLoader />
      </IonApp>
    );
  }

  // App bloqueada por PIN/huella → overlay a pantalla completa (encima de todo).
  if (locked) {
    return (
      <IonApp>
        <LockScreen />
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
            <Route
              exact
              path="/legal/:slug"
              render={({ match }) => <LegalPage slug={match.params.slug} />}
            />
            <Route render={() => <Redirect to="/login" />} />
          </IonRouterOutlet>
        </IonReactRouter>
      </IonApp>
    );
  }

  // Con sesión → app con bottom tabs + side drawer de configuración.
  return (
    <IonApp>
      <NotificationsWatcher />
      <IonReactRouter>
        {/* Side drawer: hermano del contenido enrutado (contentId="main"). */}
        <SettingsMenu />
        <IonTabs>
          <IonRouterOutlet id="main">
            <Route exact path="/home" component={HomePage} />
            <Route exact path="/send" component={SendPage} />
            <Route exact path="/receive" component={ReceivePage} />
            <Route exact path="/recharge" component={RechargePage} />
            <Route exact path="/movements" component={MovementsPage} />
            <Route exact path="/p2p" component={P2pPage} />
            <Route
              exact
              path="/p2p/trade/:id"
              render={({ match }) => <TradeDetailPage tradeId={match.params.id} />}
            />
            <Route exact path="/explore" component={ExplorePage} />
            <Route exact path="/profile" component={ProfilePage} />
            <Route exact path="/kyc" component={KycPage} />
            <Route exact path="/security" component={SecurityPage} />
            <Route exact path="/payment-methods" component={PaymentMethodsPage} />
            <Route exact path="/app-security" component={AppSecurityPage} />
            <Route
              exact
              path="/legal/:slug"
              render={({ match }) => <LegalPage slug={match.params.slug} />}
            />
            <Route exact path="/login" render={() => <Redirect to="/home" />} />
            <Route exact path="/register" render={() => <Redirect to="/home" />} />
            <Route render={() => <Redirect to="/home" />} />
          </IonRouterOutlet>

          <IonTabBar slot="bottom" className="zt-tabbar">
            <IonTabButton tab="home" href="/home" onClick={() => selection()}>
              <IonIcon icon={homeOutline} />
              <IonLabel>Inicio</IonLabel>
            </IonTabButton>
            <IonTabButton tab="send" href="/send" onClick={() => selection()}>
              <IonIcon icon={paperPlaneOutline} />
              <IonLabel>Enviar</IonLabel>
            </IonTabButton>
            <IonTabButton tab="receive" href="/receive" onClick={() => selection()}>
              <IonIcon icon={qrCodeOutline} />
              <IonLabel>Recibir</IonLabel>
            </IonTabButton>
            <IonTabButton tab="p2p" href="/p2p" onClick={() => selection()}>
              <IonIcon icon={swapHorizontalOutline} />
              <IonLabel>P2P</IonLabel>
            </IonTabButton>
            <IonTabButton tab="movements" href="/movements" onClick={() => selection()}>
              <IonIcon icon={timeOutline} />
              <IonLabel>Historial</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
}
