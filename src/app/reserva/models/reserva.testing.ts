import { ReservaDeAlojamiento, ReservaPropia } from './reserva.models';

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
  resenada: false,
  ...cambios,
});

export const reservaDeAlojamiento = (
  cambios: Partial<ReservaDeAlojamiento> = {},
): ReservaDeAlojamiento => ({
  idReserva: 'r-1',
  idAlojamiento: 'a-1',
  alojamiento: 'Cabaña frente al embalse',
  idHuesped: 'u-1',
  huesped: 'Hugo Pérez',
  fechaEntrada: '2026-12-10',
  fechaSalida: '2026-12-12',
  estado: 'PENDIENTE_APROBACION',
  montoTotal: 820000,
  retencionHasta: '2026-11-21T07:11:26Z',
  ...cambios,
});
