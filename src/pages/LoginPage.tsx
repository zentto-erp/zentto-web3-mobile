import { useState } from 'react';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonNote,
  IonPage,
  IonSpinner,
  IonText,
} from '@ionic/react';
import { Link } from 'react-router-dom';
import { login, loginTwoFactor } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

export default function LoginPage() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setBusy(true);
    try {
      const res = await login(email.trim(), password);
      if (res.mfaRequired && res.mfaToken) {
        setMfaToken(res.mfaToken);
      } else if (res.user) {
        setUser(res.user);
      }
    } catch (err) {
      setError(err instanceof ApiError ? humanize(err) : 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  }

  async function handle2fa() {
    if (!mfaToken) return;
    setError(null);
    setBusy(true);
    try {
      const { user } = await loginTwoFactor(mfaToken, code.trim());
      setUser(user);
    } catch (err) {
      setError(err instanceof ApiError ? humanize(err) : 'Código inválido.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <IonPage>
      <IonContent className="zt-page" fullscreen>
        <div className="zt-screen zt-noscale">
          <div className="zt-brand zt-enter">
            <div className="zt-logo">Z</div>
            <h1>Zentto</h1>
            <p>El centro de tu dinero digital. Dólares con respaldo real.</p>
          </div>

          {!mfaToken ? (
            <>
              <IonItem className="zt-card" lines="none" style={{ marginTop: 8 }}>
                <IonInput
                  label="Correo"
                  labelPlacement="stacked"
                  type="email"
                  inputmode="email"
                  autocomplete="email"
                  value={email}
                  onIonInput={(e) => setEmail(e.detail.value ?? '')}
                  placeholder="tucorreo@dominio.com"
                />
              </IonItem>
              <IonItem className="zt-card" lines="none">
                <IonInput
                  label="Contraseña"
                  labelPlacement="stacked"
                  type="password"
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value ?? '')}
                  placeholder="••••••••"
                />
              </IonItem>

              {error && (
                <IonNote color="danger" style={{ display: 'block', margin: '12px 4px' }}>
                  {error}
                </IonNote>
              )}

              <IonButton
                expand="block"
                style={{ marginTop: 18 }}
                disabled={busy || !email || !password}
                onClick={handleLogin}
              >
                {busy ? <IonSpinner name="crescent" /> : 'Entrar'}
              </IonButton>

              <IonText className="zt-muted" style={{ display: 'block', textAlign: 'center', marginTop: 18 }}>
                ¿No tienes cuenta? <Link className="zt-link" to="/register">Crear cuenta</Link>
              </IonText>
            </>
          ) : (
            <>
              <div className="zt-banner">
                Verificación en dos pasos activa. Ingresa el código de tu app de autenticación.
              </div>
              <IonItem className="zt-card" lines="none">
                <IonInput
                  label="Código 2FA"
                  labelPlacement="stacked"
                  inputmode="numeric"
                  maxlength={6}
                  value={code}
                  onIonInput={(e) => setCode(e.detail.value ?? '')}
                  placeholder="123456"
                />
              </IonItem>

              {error && (
                <IonNote color="danger" style={{ display: 'block', margin: '12px 4px' }}>
                  {error}
                </IonNote>
              )}

              <IonButton
                expand="block"
                style={{ marginTop: 18 }}
                disabled={busy || code.length < 6}
                onClick={handle2fa}
              >
                {busy ? <IonSpinner name="crescent" /> : 'Verificar'}
              </IonButton>
              <IonButton
                expand="block"
                fill="clear"
                color="medium"
                onClick={() => {
                  setMfaToken(null);
                  setCode('');
                  setError(null);
                }}
              >
                Volver
              </IonButton>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

function humanize(err: ApiError): string {
  if (err.status === 401) return 'Correo o contraseña incorrectos.';
  if (err.status === 0) return 'Sin conexión con el servidor. ¿Está corriendo el backend en :4100?';
  return err.message || 'No se pudo iniciar sesión.';
}
