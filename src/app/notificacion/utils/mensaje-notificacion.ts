import { estadoPublicacion, modoAceptacion } from '../../alojamiento/models/alojamiento.models';
import { formatearFechaHora } from '../../alojamiento/utils/formato';
import { estadoReserva } from '../../reserva/models/reserva.models';

const ESTADOS_PUBLICACION = ['BORRADOR', 'PENDIENTE_REVISION', 'ACTIVA', 'PAUSADA', 'BLOQUEADA'];
const MODOS = ['INMEDIATA', 'APROBACION'];
const IDENTIFICADOR =
  /(?: Identificador:)? [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const FECHA_ISO = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})/g;
const CODIGO = /\b[A-Z][A-Z_]{3,}\b/g;

function etiqueta(codigo: string): string {
  if (MODOS.includes(codigo)) {
    return modoAceptacion(codigo);
  }
  if (ESTADOS_PUBLICACION.includes(codigo)) {
    return estadoPublicacion(codigo).etiqueta;
  }
  const reserva = estadoReserva(codigo).etiqueta;
  return reserva === codigo ? codigo : reserva;
}

const CAMBIO_DE_RESERVA =
  /^(Tu reserva|Una reserva de tu alojamiento) cambió de estado: ([A-Z_]+) → ([A-Z_]+)\.$/;

/** Lo que le pasó a la reserva, dicho como una frase y no como "A → B". */
const LO_QUE_PASO: Record<string, string> = {
  PENDIENTE_APROBACION: 'quedó esperando aprobación',
  PENDIENTE_PAGO: 'quedó pendiente de pago',
  CONFIRMADA: 'fue confirmada',
  COMPLETADA: 'fue completada',
  CANCELADA: 'fue cancelada',
  RECHAZADA: 'fue rechazada',
  EXPIRADA: 'venció',
};

function cambioDeReserva(mensaje: string): string | null {
  const coincidencia = CAMBIO_DE_RESERVA.exec(mensaje);
  if (!coincidencia) {
    return null;
  }
  const [, sujeto, , nuevo] = coincidencia;
  const accion = LO_QUE_PASO[nuevo];
  return accion ? `${sujeto} ${accion}.` : null;
}

export function mensajeLegible(mensaje: string): string {
  const frase = cambioDeReserva(mensaje);
  if (frase) {
    return frase;
  }
  return mensaje
    .replace(IDENTIFICADOR, '')
    .replace(FECHA_ISO, (fecha) => formatearFechaHora(fecha) || fecha)
    .replace(CODIGO, etiqueta);
}
