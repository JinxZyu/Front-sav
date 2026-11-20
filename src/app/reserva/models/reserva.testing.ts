import { ReservaPropia } from './reserva.models';

export const reservaPropia = (cambios: Partial<ReservaPropia> = {}): ReservaPropia => ({
  idReserva: 'r-1',
  idAlojamiento: 'a-1',
  alojamiento: 'Loft en Chapinero',
  fechaEntrada: '2026-12-04',
  fechaSalida: '2026-12-07',
  montoTotal: 649000,
  estado: 'PENDIENTE_PAGO',
  fechaSolicitud: '2026-11-20T07:11:16Z',
  retencionHasta: null,
  ...cambios,
});
