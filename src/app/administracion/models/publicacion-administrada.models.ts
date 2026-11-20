export interface PublicacionAdministrada {
  idPublicacion: string;
  idAlojamiento: string;
  titulo: string;
  estado: string;
  fechaCreacion: string;
  fechaActualizacion: string | null;
}

export interface DecisionPublicacion {
  idRevision: string;
  idPublicacion: string;
  accion: string;
  estadoAnterior: string;
  estadoActual: string;
  motivo: string | null;
  mensaje: string;
  fechaRevision: string;
}

export const EN_REVISION = 'PENDIENTE_REVISION';

export const MAXIMO_MOTIVO_PUBLICACION = 2000;

export const MODOS_ACEPTACION_ADMINISTRACION: Record<string, string> = {
  INMEDIATA: 'Reserva inmediata',
  APROBACION: 'El anfitrión aprueba cada solicitud',
};
