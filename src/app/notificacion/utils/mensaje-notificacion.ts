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

export function mensajeLegible(mensaje: string): string {
  return mensaje
    .replace(IDENTIFICADOR, '')
    .replace(FECHA_ISO, (fecha) => formatearFechaHora(fecha) || fecha)
    .replace(CODIGO, etiqueta);
}
