import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { chatbubbleEllipsesOutline, close, flash, sendOutline } from 'ionicons/icons';
import { useEffect, useRef, useState } from 'react';

import { tapLight } from '../lib/haptics';
import { hideKeyboard } from '../lib/keyboard';
import { loadHistory, saveHistory, streamSupport, type SupportMsg } from '../lib/support';

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<SupportMsg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory().then(setMsgs);
  }, []);
  useEffect(() => {
    saveHistory(msgs);
    requestAnimationFrame(() => bodyRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }));
  }, [msgs]);

  const send = async () => {
    const q = text.trim();
    if (!q || busy) return;
    hideKeyboard();
    setText('');
    setMsgs((m) => [...m, { role: 'user', text: q, ts: Date.now() }, { role: 'assistant', text: '', ts: Date.now() }]);
    setBusy(true);
    tapLight();
    const append = (chunk: string) =>
      setMsgs((m) => {
        const c = [...m];
        c[c.length - 1] = { ...c[c.length - 1], text: c[c.length - 1].text + chunk };
        return c;
      });
    try {
      const { sources } = await streamSupport(q, append);
      setMsgs((m) => {
        const c = [...m];
        const last = c[c.length - 1];
        c[c.length - 1] = { ...last, text: last.text || 'No pude responder ahora.', sources };
        return c;
      });
    } catch {
      setMsgs((m) => {
        const c = [...m];
        c[c.length - 1] = { ...c[c.length - 1], text: 'No hay conexión con el soporte ahora.' };
        return c;
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="zt-support-fab" onClick={() => { tapLight(); setOpen(true); }} aria-label="Soporte">
        <IonIcon icon={chatbubbleEllipsesOutline} />
      </button>

      <IonModal className="zt-support-modal" isOpen={open} onDidDismiss={() => setOpen(false)} breakpoints={[0, 0.8]} initialBreakpoint={0.8} handle>
        <IonHeader>
          <IonToolbar className="zt-support-bar">
            <div slot="start" className="zt-support-ava"><IonIcon icon={flash} /></div>
            <IonTitle>
              <div className="zt-support-ttl">Zentto Assistant</div>
              <div className="zt-support-sub">● Soporte IA</div>
            </IonTitle>
            <IonButtons slot="end"><IonButton onClick={() => setOpen(false)}><IonIcon icon={close} /></IonButton></IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="zt-chat-body" ref={bodyRef}>
            {msgs.length === 0 && (
              <div className="zt-chat-empty">
                <p>👋 Hola, soy el asistente de Zentto.</p>
                <p>Pregúntame sobre tu cuenta, transferencias, P2P, KYC o cómo usar la app.</p>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`zt-bubble ${m.role}`}>
                {m.role === 'assistant' && !m.text ? (
                  <div className="zt-typing"><span /><span /><span /></div>
                ) : (
                  <div className="zt-bubble-txt">{m.text}</div>
                )}
                {m.sources && m.sources.length > 0 && (
                  <div className="zt-bubble-src">
                    {m.sources.slice(0, 3).map((s, j) => (
                      <a key={j} href={s.url} target="_blank" rel="noreferrer">🔗 {s.title}</a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </IonContent>
        <IonFooter className="zt-chat-footer">
          <div className="zt-chat-input">
            <IonInput
              value={text}
              placeholder="Pregúntame sobre tu cuenta, P2P…"
              onIonInput={(e) => setText(e.detail.value ?? '')}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="zt-chat-send" onClick={send} disabled={busy || !text.trim()}>
              {busy ? <IonSpinner name="dots" /> : <IonIcon icon={sendOutline} />}
            </button>
          </div>
          <div className="zt-chat-foot">Powered by <b>Zentto Notify</b></div>
        </IonFooter>
      </IonModal>
    </>
  );
}
