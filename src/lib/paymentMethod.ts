import type { PaymentMethod } from '../api/types';

/** Etiqueta legible del tipo de método de cobro. */
export function paymentMethodTypeLabel(type: string): string {
  return type === 'pago_movil' ? 'Pago Móvil' : type === 'bank_account' ? 'Cuenta bancaria' : type;
}

/**
 * Convierte un método de cobro en texto legible de una línea, listo para adjuntar
 * a una oferta P2P y que la contraparte lo copie.
 * Ej: "Pago Móvil · BDV · 0414-1234567 · V-7786676 · Raúl González".
 */
export function paymentMethodToText(m: PaymentMethod): string {
  const parts: string[] = [paymentMethodTypeLabel(m.type)];
  if (m.bankName) parts.push(m.bankName);
  if (m.type === 'pago_movil') {
    if (m.phone) parts.push(m.phone);
    if (m.idNumber) parts.push(m.idNumber);
  } else {
    if (m.accountNumber) parts.push(m.accountNumber);
    if (m.idNumber) parts.push(m.idNumber);
  }
  if (m.accountHolder) parts.push(m.accountHolder);
  return parts.join(' · ');
}

/**
 * Etiqueta PÚBLICA del método (tipo + banco), SIN datos sensibles. Es lo único
 * que se muestra en el order book; los números se revelan al tomar la oferta.
 * Ej: "Pago Móvil · Mercantil".
 */
export function paymentMethodPublicLabel(m: PaymentMethod): string {
  const parts = [paymentMethodTypeLabel(m.type)];
  if (m.bankName) parts.push(m.bankName);
  return parts.join(' · ');
}

/** Pares clave/valor copiables de un método de cobro (para la pantalla de detalle). */
/** Bloque multilínea con TODOS los datos del método, listo para copiar de una vez. */
export function paymentMethodToBlock(m: PaymentMethod): string {
  const lines: string[] = [m.label || paymentMethodTypeLabel(m.type)];
  for (const f of paymentMethodFields(m)) lines.push(`${f.label}: ${f.value}`);
  return lines.join('\n');
}

export function paymentMethodFields(m: PaymentMethod): { label: string; value: string }[] {
  const fields: { label: string; value: string }[] = [];
  if (m.bankName) fields.push({ label: 'Banco', value: m.bankName });
  if (m.type === 'pago_movil' && m.phone) fields.push({ label: 'Teléfono', value: m.phone });
  if (m.type === 'bank_account' && m.accountNumber)
    fields.push({ label: 'Nro. de cuenta', value: m.accountNumber });
  if (m.idNumber) fields.push({ label: 'Cédula / RIF', value: m.idNumber });
  if (m.accountHolder) fields.push({ label: 'Titular', value: m.accountHolder });
  return fields;
}
