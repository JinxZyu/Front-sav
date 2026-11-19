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
  precioPorNoche: number;
  tarifaLimpieza: number;
  modoAceptacion: ModoAceptacion;
  idPolitica: string;
  idsServicios: string[];
  imagenes: File[];
}

export interface PublicacionCreada {
  idAlojamiento: string;
  idPublicacion: string;
  titulo: string;
  estado: string;
  imagenes: string[];
}
