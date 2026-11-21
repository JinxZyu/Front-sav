export const TIPOS_ALOJAMIENTO = [
  'Apartamento',
  'Cabaña',
  'Casa',
  'Finca',
  'Glamping',
  'Habitación',
] as const;

export const MODOS_ACEPTACION = [
  {
    valor: 'INMEDIATA',
    titulo: 'Reserva inmediata',
    descripcion: 'Las reservas se confirman en cuanto el huésped paga.',
  },
  {
    valor: 'APROBACION',
    titulo: 'Con mi aprobación',
    descripcion: 'Revisas cada solicitud y decides si la aceptas.',
  },
] as const;

export type ModoAceptacion = (typeof MODOS_ACEPTACION)[number]['valor'];

export interface ServicioDisponible {
  idServicio: string;
  nombre: string;
  descripcion: string | null;
}

export interface PoliticaCancelacion {
  idPolitica: string;
  nombre: string;
  version: number;
  descripcion: string | null;
  anticipacionHoras: number | null;
  porcentajeDevolucion: number | null;
}

export interface NuevaPublicacion {
  titulo: string;
  descripcion: string;
  reglas: string;
  ubicacion: string;
  ciudad: string;
  tipoAlojamiento: string;
  capacidad: number;
  habitaciones: number;
  camas: number;
  banos: number;
  propietarioInmueble: string;
  pais?: string;
  codigoPais?: string;
  precioPorNoche: number;
  tarifaLimpieza: number;
  modoAceptacion: ModoAceptacion;
  idPolitica: string;
  idsServicios: string[];
  imagenes: File[];
  mensajeCambios?: string;
}

export interface PublicacionCreada {
  idAlojamiento: string;
  idPublicacion: string;
  titulo: string;
  estado: string;
  imagenes: string[];
}

export interface ResumenPublicacion {
  idPublicacion: string;
  idAlojamiento: string;
  titulo: string;
  ciudad: string;
  tipoAlojamiento: string;
  capacidad: number;
  precioPorNoche: number;
  estado: string;
  fechaCreacion: string;
  imagenPortada?: string | null;
  pais?: string | null;
  codigoPais?: string | null;
}

export interface MisPublicaciones {
  mensaje: string;
  publicaciones: ResumenPublicacion[];
}

export interface ImagenPublicacion {
  idImagen: string;
  rutaImagen: string;
  orden: number;
  esPortada: boolean;
}

export interface DetallePublicacion {
  idPublicacion: string;
  idAlojamiento: string;
  idPolitica: string;
  titulo: string;
  descripcion: string;
  reglas: string | null;
  precioPorNoche: number;
  tarifaLimpieza: number | null;
  modoAceptacion: string;
  estado: string;
  fechaCreacion: string;
  fechaActualizacion: string | null;
  ubicacion: string;
  ciudad: string;
  tipoAlojamiento: string;
  capacidad: number;
  habitaciones: number;
  camas: number;
  banos: number;
  propietarioInmueble?: string | null;
  pais?: string | null;
  codigoPais?: string | null;
  servicios: ServicioDisponible[];
  imagenes: ImagenPublicacion[];
}

export interface EstadoPublicacion {
  etiqueta: string;
  tono: 'borrador' | 'revision' | 'activa' | 'pausada' | 'rechazo' | 'neutro';
}

const ESTADOS_PUBLICACION: Record<string, EstadoPublicacion> = {
  BORRADOR: { etiqueta: 'Borrador', tono: 'borrador' },
  PENDIENTE_REVISION: { etiqueta: 'En revisión', tono: 'revision' },
  ACTIVA: { etiqueta: 'Publicada', tono: 'activa' },
  PAUSADA: { etiqueta: 'Pausada', tono: 'pausada' },
  RECHAZADA: { etiqueta: 'Rechazada', tono: 'rechazo' },
  BLOQUEADA: { etiqueta: 'Bloqueada', tono: 'rechazo' },
};

const ESTADOS_SIN_EDICION: Record<string, string> = {
  PENDIENTE_REVISION:
    'Un administrador está revisando esta publicación. Podrás editarla cuando termine la revisión.',
  BLOQUEADA:
    'Un administrador bloqueó esta publicación. Mientras siga bloqueada no puedes editarla.',
};

export function motivoSinEdicion(estado: string): string | null {
  return ESTADOS_SIN_EDICION[estado] ?? null;
}

export function estadoPublicacion(estado: string): EstadoPublicacion {
  const conocido = ESTADOS_PUBLICACION[estado];
  if (conocido) {
    return conocido;
  }
  const texto = estado.replaceAll('_', ' ').toLowerCase();
  return { etiqueta: texto.charAt(0).toUpperCase() + texto.slice(1), tono: 'neutro' };
}

export function modoAceptacion(valor: string): string {
  return MODOS_ACEPTACION.find((modo) => modo.valor === valor)?.titulo ?? valor;
}

export interface CambioEstadoPublicacion {
  idPublicacion: string;
  estadoAnterior: string;
  estadoActual: string;
  mensaje: string;
  fechaActualizacion: string;
}

export interface PoliticaDePublicacion extends PoliticaCancelacion {
  idPublicacion: string;
  activa: boolean;
}

export function formatearPorcentaje(valor: number | null): string {
  return valor === null ? '' : `${Number(valor)} %`;
}

export interface ServicioAdicional {
  idAdicional: string;
  nombre: string;
  descripcion: string | null;
  costo: number;
  activo: boolean;
}

export interface ConfiguracionComercial {
  idPublicacion: string;
  tarifaLimpieza: number;
  serviciosAdicionales: ServicioAdicional[];
  fechaActualizacion: string | null;
}

export interface NuevaConfiguracionComercial {
  tarifaLimpieza: number;
  serviciosAdicionales: { nombre: string; descripcion: string | null; costo: number }[];
}

export interface ModoAceptacionDePublicacion {
  idPublicacion: string;
  modoAceptacion: string;
  fechaActualizacion: string | null;
}

export const ESTADOS_CON_REVISION_DE_CAMBIOS = ['ACTIVA', 'PAUSADA'];

export const MAXIMO_MENSAJE_CAMBIOS = 1000;
export const MAXIMO_PROPIETARIO = 120;
