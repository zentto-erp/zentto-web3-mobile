import { useEffect, useRef, useState } from 'react';
import { IonButton, IonIcon, IonModal, IonSpinner } from '@ionic/react';
import { cameraReverseOutline, closeOutline, ellipseOutline } from 'ionicons/icons';
import { fileToCaptured, type CapturedImage } from '../lib/capture';
import { tapLight } from '../lib/haptics';

export type CaptureShape = 'oval' | 'card';

interface Props {
  isOpen: boolean;
  shape: CaptureShape; // 'oval' = selfie · 'card' = documento
  title: string;
  hint?: string;
  onCapture: (img: CapturedImage) => void;
  onDismiss: () => void;
}

/**
 * Cámara EN la app con guía visual (óvalo para selfie, recuadro para documento),
 * estilo Didit/Meru — en vez de abrir la cámara cruda del sistema. Usa getUserMedia
 * + canvas. La selfie usa cámara frontal; el documento, la trasera.
 */
export default function CameraCaptureModal({
  isOpen,
  shape,
  title,
  hint,
  onCapture,
  onDismiss,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>(
    shape === 'oval' ? 'user' : 'environment',
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start(mode: 'user' | 'environment') {
    setReady(false);
    setError(null);
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setReady(true);
    } catch {
      setError('No se pudo acceder a la cámara. Revisa los permisos.');
    }
  }

  useEffect(() => {
    if (isOpen) void start(facing);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facing]);

  function flip() {
    tapLight();
    setFacing((f) => (f === 'user' ? 'environment' : 'user'));
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !ready) return;
    tapLight();
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Espeja la selfie (cámara frontal) para que coincida con lo que ve el usuario.
    if (facing === 'user') {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(fileToCaptured(blob));
        stop();
      },
      'image/jpeg',
      0.9,
    );
  }

  const isOval = shape === 'oval';

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: '#000',
          overflow: 'hidden',
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: facing === 'user' ? 'scaleX(-1)' : 'none',
          }}
        />

        {/* Overlay con la guía (óvalo / recuadro) y máscara oscura alrededor */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          <defs>
            <mask id="cut">
              <rect width="100" height="100" fill="white" />
              {isOval ? (
                <ellipse cx="50" cy="44" rx="30" ry="38" fill="black" />
              ) : (
                <rect x="10" y="30" width="80" height="40" rx="4" fill="black" />
              )}
            </mask>
          </defs>
          <rect width="100" height="100" fill="rgba(0,0,0,0.62)" mask="url(#cut)" />
          {isOval ? (
            <ellipse cx="50" cy="44" rx="30" ry="38" fill="none" stroke="#6366f1" strokeWidth="0.6" />
          ) : (
            <rect x="10" y="30" width="80" height="40" rx="4" fill="none" stroke="#6366f1" strokeWidth="0.6" />
          )}
        </svg>

        {/* Header */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: 'calc(env(safe-area-inset-top) + 12px) 16px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#fff',
          }}
        >
          <button
            type="button"
            onClick={() => {
              stop();
              onDismiss();
            }}
            aria-label="Cerrar"
            style={{ background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', borderRadius: 999, width: 38, height: 38 }}
          >
            <IonIcon icon={closeOutline} style={{ fontSize: 22 }} />
          </button>
          <strong style={{ fontSize: 15 }}>{title}</strong>
          <button
            type="button"
            onClick={flip}
            aria-label="Cambiar cámara"
            style={{ background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', borderRadius: 999, width: 38, height: 38 }}
          >
            <IonIcon icon={cameraReverseOutline} style={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Hint */}
        <div
          style={{
            position: 'absolute',
            top: isOval ? '84%' : '74%',
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#fff',
            padding: '0 24px',
            fontSize: 13,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}
        >
          {hint ?? (isOval ? 'Centra tu rostro en el óvalo' : 'Encuadra el documento en el recuadro')}
        </div>

        {/* Loading / error */}
        {!ready && !error && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <IonSpinner name="crescent" style={{ color: '#fff' }} />
          </div>
        )}
        {error && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              padding: 24,
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <div>
              <IonIcon icon={ellipseOutline} style={{ fontSize: 40, opacity: 0.6 }} />
              <p>{error}</p>
              <IonButton fill="outline" onClick={() => start(facing)}>
                Reintentar
              </IonButton>
            </div>
          </div>
        )}

        {/* Botón de captura */}
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(env(safe-area-inset-bottom) + 26px)',
            left: 0,
            right: 0,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={capture}
            disabled={!ready}
            aria-label="Capturar"
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              border: '4px solid rgba(255,255,255,0.85)',
              background: ready ? '#fff' : 'rgba(255,255,255,0.4)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      </div>
    </IonModal>
  );
}
