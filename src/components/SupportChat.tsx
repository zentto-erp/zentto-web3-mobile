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
import {
  bugOutline,
  chatbubbleEllipsesOutline,
  chevronForward,
  close,
  flash,
  sendOutline,
  swapHorizontalOutline,
  walletOutline,
} from 'ionicons/icons';
import { Browser } from '@capacitor/browser';
import { useEffect, useRef, useState } from 'react';

import { tapLight } from '../lib/haptics';
import { hideKeyboard } from '../lib/keyboard';
import { loadHistory, saveHistory, streamSupport, type SupportMsg } from '../lib/support';
import { bugReportUrl } from '../lib/legalContent';
import { useAccountBalance, usePayments } from '../hooks/usePayments';
import { formatAmount, formatDate, paymentTypeLabel } from '../lib/format';

const QUICK = ['¿Cuál es mi saldo?', '¿Cómo recibo dinero?', '¿Qué es P2P?'];

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<SupportMsg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const payments = usePayments();
  const balance = useAccountBalance();
  const recent = (payments.data ?? []).slice(0, 3);
  const primary = (balance.data ?? [])[0];

  useEffect(() => {
    loadHistory().then(setMsgs);
  }, []);
  useEffect(() => {
    saveHistory(msgs);
    requestAnimationFrame(() => bodyRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }));
  }, [msgs]);

  const send = async (override?: string) => {
    const q = (override ?? text).trim();
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

      <IonModal className="zt-support-modal" isOpen={open} onDidDismiss={() => setOpen(false)}>
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
              <div className="zt-chat-welcome">
                <p className="zt-chat-hi">👋 Hola, aquí tienes tu resumen:</p>

                {primary && (
                  <button className="zt-ai-card" onClick={() => send('¿Cuál es mi saldo disponible y cómo lo puedo usar?')}>
                    <span className="zt-ai-ic"><IonIcon icon={walletOutline} /></span>
                    <span className="zt-ai-body">
                      <span className="zt-ai-ttl">{primary.asset} disponible</span>
                      <span className="zt-ai-sub">{formatAmount(primary.available)} {primary.asset}</span>
                    </span>
                    <IonIcon className="zt-ai-go" icon={chevronForward} />
                  </button>
                )}

                {recent.length > 0 && (
                  <button className="zt-ai-card" onClick={() => send('Resume mis últimas transacciones completadas.')}>
                    <span className="zt-ai-ic"><IonIcon icon={swapHorizontalOutline} /></span>
                    <span className="zt-ai-body">
                      <span className="zt-ai-ttl">Últimas transacciones</span>
                      <span className="zt-ai-sub">
                        {recent.map((p) => `${paymentTypeLabel(p.type)} ${formatAmount(p.amount)}`).join(' · ')}
                      </span>
                    </span>
                    <IonIcon className="zt-ai-go" icon={chevronForward} />
                  </button>
                )}

                {recent.length > 0 && (
                  <div className="zt-ai-mini">
                    {recent.map((p) => (
                      <div className="zt-ai-mini-row" key={p.id}>
                        <span>{paymentTypeLabel(p.type)}</span>
                        <span className="zt-ai-mini-meta">{formatAmount(p.amount)} {p.asset} · {formatDate(p.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="zt-chat-hint">O pregúntame sobre tu cuenta, transferencias, P2P o KYC.</p>

                <button
                  className="zt-report-btn"
                  onClick={() => Browser.open({ url: bugReportUrl('Zentto Web3', '0.1.0') })}
                >
                  <IonIcon icon={bugOutline} /> Reportar una falla
                </button>
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
          <div className="zt-chat-chips">
            {QUICK.map((q) => (
              <button key={q} className="zt-chat-chip" onClick={() => send(q)} disabled={busy}>{q}</button>
            ))}
          </div>
          <div className="zt-chat-input">
            <IonInput
              value={text}
              placeholder="Pregunta al asistente de Zentto…"
              onIonInput={(e) => setText(e.detail.value ?? '')}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="zt-chat-send" onClick={() => send()} disabled={busy || !text.trim()}>
              {busy ? <IonSpinner name="dots" /> : <IonIcon icon={sendOutline} />}
            </button>
          </div>
          <div className="zt-chat-foot">Powered by <b>Zentto Notify</b></div>
        </IonFooter>
      </IonModal>
    </>
  );
}
