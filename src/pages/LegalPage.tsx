import { IonContent, IonPage } from '@ionic/react';
import { useParams } from 'react-router-dom';
import ZenttoHeader from '../components/ZenttoHeader';
import { LEGAL_DOCS, type LegalDoc } from '../lib/legalContent';

/** Renderiza un documento legal por slug. Acepta `slug` por prop (desde
 *  match.params) porque useParams no es fiable para rutas :param dentro de IonTabs. */
export default function LegalPage({ slug: propSlug }: { slug?: string }) {
  const params = useParams<{ slug: string }>();
  const slug = (propSlug ?? params.slug ?? '').toLowerCase();
  const doc: LegalDoc | undefined = LEGAL_DOCS[slug as LegalDoc['slug']];

  if (!doc) {
    return (
      <IonPage>
        <ZenttoHeader title="Legal" showProfile={false} />
        <IonContent className="zt-page" fullscreen>
          <div className="zt-screen">
            <div className="zt-empty">
              <p>Documento no encontrado.</p>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <ZenttoHeader title={doc.title} showProfile={false} />
      <IonContent className="zt-page" fullscreen>
        <div className="zt-screen zt-legal">
          <p className="zt-muted" style={{ marginTop: 4 }}>
            Última actualización: {doc.updatedAt}
          </p>
          <p style={{ marginTop: 8 }}>{doc.intro}</p>

          {doc.sections.map((s) => (
            <section key={s.heading} style={{ marginTop: 18 }}>
              <h3>{s.heading}</h3>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="zt-legal-p">
                  {p}
                </p>
              ))}
            </section>
          ))}

          <p className="zt-muted" style={{ margin: '28px 0 12px', textAlign: 'center' }}>
            Zentto Web3 · el centro de tu dinero digital
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
