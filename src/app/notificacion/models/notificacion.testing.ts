import { Notificacion } from './notificacion.models';

export const notificacion = (cambios: Partial<Notificacion> = {}): Notificacion => ({
  idNotificacion: 'n-1',
  idUsuario: 'u-1',
  idReserva: 'r-1',
  idPublicacion: 'p-1',
  tipo: 'RESERVA_ESTADO_CAMBIADO',
  mensaje: 'Tu reserva cambió de estado: PENDIENTE_PAGO → CONFIRMADA.',
  fechaCreacion: '2026-11-18T10:00:00Z',
  fechaLectura: null,
  ...cambios,
});
