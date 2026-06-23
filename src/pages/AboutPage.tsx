import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/react';
import {
  chevronForward,
  documentTextOutline,
  globeOutline,
  lockClosedOutline,
  logoFacebook,
  logoInstagram,
  logoLinkedin,
  logoTwitter,
  shieldCheckmarkOutline,
  starOutline,
} from 'ionicons/icons';
import { Browser } from '@capacitor/browser';
import { Link } from 'react-router-dom';

import ZenttoHeader from '../components/ZenttoHeader';
import { COMPANY, PLAY_STORE_ID, SOCIAL } from '../lib/legalContent';

const APP_VERSION = '0.1.0';
const LANDING = 'https://zentto.net';
const PLAY_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_ID}`;
const open = (url: string) => Browser.open({ url });

export default function AboutPage() {
  return (
    <IonPage>
      <ZenttoHeader title="Acerca de" showProfile={false} />
      <IonContent className="zt-page" fullscreen>
        <div className="zt-screen">
          <div className="zt-about-brand" onClick={() => Browser.open({ url: LANDING })} role="button">
            <div className="zt-logo">Z</div>
            <h1>Zentto Web3</h1>
            <p className="zt-muted">El centro de tu dinero digital · v{APP_VERSION}</p>
            <span className="zt-about-dev">En desarrollo</span>
          </div>

          <div className="zt-card">
            <h3>Qué es</h3>
            <p className="zt-legal-p">
              Zentto Web3 es una plataforma tecnológica de finanzas digitales que te permite mantener saldos en
              criptoactivos, enviar y recibir dinero, y operar en un mercado entre usuarios (P2P). Actualmente se
              encuentra en fase de desarrollo y pruebas.
            </p>
          </div>

          <div className="zt-card">
            <h3>Empresa</h3>
            <p className="zt-legal-p"><b>{COMPANY.legalName}</b> · RIF {COMPANY.rif}</p>
            <p className="zt-legal-p">{COMPANY.ecosystem}.</p>
            <p className="zt-legal-p">Contacto: {COMPANY.email} · {COMPANY.site}</p>
          </div>

          <IonButton expand="block" onClick={() => open(PLAY_URL)}>
            <IonIcon slot="start" icon={starOutline} />
            Califícanos en Play Store
          </IonButton>

          <IonButton expand="block" fill="outline" onClick={() => open(LANDING)}>
            <IonIcon slot="start" icon={globeOutline} />
            Conoce todo el ecosistema Zentto
          </IonButton>

          <div className="zt-social">
            <p className="zt-muted" style={{ textAlign: 'center', marginBottom: 10 }}>Síguenos</p>
            <div className="zt-social-row">
              <button onClick={() => open(SOCIAL.instagram)} aria-label="Instagram"><IonIcon icon={logoInstagram} /></button>
              <button onClick={() => open(SOCIAL.x)} aria-label="X"><IonIcon icon={logoTwitter} /></button>
              <button onClick={() => open(SOCIAL.facebook)} aria-label="Facebook"><IonIcon icon={logoFacebook} /></button>
              <button onClick={() => open(SOCIAL.linkedin)} aria-label="LinkedIn"><IonIcon icon={logoLinkedin} /></button>
            </div>
          </div>

          <div className="zt-card" style={{ padding: 0 }}>
            <Link className="zt-about-row" to="/legal/terminos">
              <IonIcon icon={documentTextOutline} />
              <span>Términos y Condiciones</span>
              <IonIcon className="zt-about-go" icon={chevronForward} />
            </Link>
            <Link className="zt-about-row" to="/legal/privacidad">
              <IonIcon icon={lockClosedOutline} />
              <span>Política de Privacidad</span>
              <IonIcon className="zt-about-go" icon={chevronForward} />
            </Link>
            <Link className="zt-about-row" to="/legal/responsabilidad">
              <IonIcon icon={shieldCheckmarkOutline} />
              <span>Aviso de Responsabilidad</span>
              <IonIcon className="zt-about-go" icon={chevronForward} />
            </Link>
          </div>

          <p className="zt-muted" style={{ textAlign: 'center', margin: '24px 0 12px' }}>
            © {new Date().getFullYear()} {COMPANY.legalName}
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
