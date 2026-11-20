export interface Notificacion {
  idNotificacion: string;
  idUsuario: string;
  idReserva: string | null;
  idPublicacion: string | null;
  tipo: string;
  mensaje: string;
  fechaCreacion: string;
  fechaLectura: string | null;
}
