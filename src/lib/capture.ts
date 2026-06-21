// Captura de imagen para KYC.
// Intenta @capacitor/camera (Camera.getPhoto) si está disponible en runtime;
// si no, el componente usa el fallback web <input type="file" accept="image/*" capture>.
// Nota: @capacitor/camera no es dependencia del bundle web — se carga de forma
// perezosa y opcional para no romper el build cuando no está instalado.

export interface CapturedImage {
  blob: Blob;
  previewUrl: string; // object URL para previsualización
}

/** Convierte un File/Blob en CapturedImage con object URL para preview. */
export function fileToCaptured(file: Blob): CapturedImage {
  return { blob: file, previewUrl: URL.createObjectURL(file) };
}

/**
 * Intenta capturar con la cámara nativa de Capacitor. Devuelve null si el plugin
 * no está disponible (web/PWA) — el caller debe usar el <input> de fallback.
 */
export async function tryNativeCamera(source: 'camera' | 'photos'): Promise<CapturedImage | null> {
  try {
    // import dinámico opcional: si el paquete no está instalado, cae al catch.
    // Se castea a un tipo laxo para no exigir @types de @capacitor/camera en build web.
    const specifier = '@capacitor/camera';
    const mod = (await import(/* @vite-ignore */ specifier).catch(() => null)) as {
      Camera?: {
        getPhoto: (o: unknown) => Promise<{ webPath?: string }>;
      };
      CameraResultType?: Record<string, string>;
      CameraSource?: Record<string, string>;
    } | null;
    if (!mod?.Camera) return null;
    const photo = await mod.Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: mod.CameraResultType?.Uri ?? 'uri',
      source:
        source === 'camera'
          ? (mod.CameraSource?.Camera ?? 'CAMERA')
          : (mod.CameraSource?.Photos ?? 'PHOTOS'),
    });
    if (!photo.webPath) return null;
    const res = await fetch(photo.webPath);
    const blob = await res.blob();
    return { blob, previewUrl: photo.webPath };
  } catch {
    return null;
  }
}

/** Libera un object URL de preview. */
export function revokePreview(img?: CapturedImage | null) {
  if (img?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(img.previewUrl);
}

/**
 * Comprime una imagen a un data URL JPEG redimensionado (máx. `maxSide` px) para
 * subir evidencias de pago sin exceder el límite del backend (~2 MB base64).
 * Cae a la lectura directa si el navegador no soporta canvas.
 */
export async function imageToCompressedDataUrl(blob: Blob, maxSide = 1280): Promise<string> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no-canvas');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return canvas.toDataURL('image/jpeg', 0.72);
  } catch {
    return blobToDataUrl(blob);
  }
}

/** Lee un Blob como data URL base64. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
