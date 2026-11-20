export interface SolicitudCotizacion {
  idPublicacion: string;
  fechaEntrada: string;
  fechaSalida: string;
  cantidadHuespedes: number;
  idsAdicionales: string[];
}

export interface AdicionalCotizado {
  idAdicional: string;
  nombre: string;
  cantidad: number;
  precioAplicado: number;
  subtotal: number;
}

export interface Cotizacion {
  idCotizacion: string;
  idPublicacion: string;
  fechaEntrada: string;
  fechaSalida: string;
  noches: number;
  cantidadHuespedes: number;
  precioPorNoche: number;
  subtotalAlojamiento: number;
  tarifaLimpieza: number;
  porcentajeServicio: number;
  costoServicio: number;
  porcentajeDescuento: number;
  montoDescuento: number;
  serviciosAdicionales: AdicionalCotizado[];
  costoAdicionalTotal: number;
  total: number;
}

export interface SolicitudReserva {
  idReserva: string;
  idCotizacion: string;
  modoAceptacion: string;
  estado: string;
  fechaSolicitud: string;
  retencionHasta: string | null;
}

export interface RetencionReserva {
  idReserva: string;
  estadoReserva: string;
  monto: number;
  retencionHasta: string | null;
  mensaje: string;
}

export interface PagoReserva {
  idReserva: string;
  idPago: string;
  estadoReserva: string;
  estadoPago: string;
  monto: number;
  retencionHasta: string | null;
  referenciaPago: string | null;
  mensaje: string;
}

export interface ReservaPropia {
  idReserva: string;
  idAlojamiento: string;
  alojamiento: string;
  fechaEntrada: string;
  fechaSalida: string;
  montoTotal: number;
  estado: string;
  fechaSolicitud: string;
  retencionHasta: string | null;
  resenada: boolean;
}

export interface MisReservas {
  reservas: ReservaPropia[];
  totalResultados: number;
  mensaje: string | null;
}

export interface ReservaDeAlojamiento {
  idReserva: string;
  idAlojamiento: string;
  alojamiento: string;
  idHuesped: string;
  huesped: string;
  fechaEntrada: string;
  fechaSalida: string;
  estado: string;
  montoTotal: number;
  retencionHasta: string | null;
}

export interface ReservasDeAlojamientos {
  reservas: ReservaDeAlojamiento[];
  totalResultados: number;
  mensaje: string | null;
}

export interface DecisionReserva {
  idReserva: string;
  estado: string;
  fechaDecision: string;
  retencionHasta: string | null;
  mensaje: string;
}

export interface CancelacionReserva {
  idReserva: string;
  estadoFinal: string;
  fechaCancelacion: string;
  motivo: string;
  porcentajeDevolucion: number;
  valorDevolucion: number;
  estadoDevolucion: string;
  mensaje: string;
}

export interface AvisoReserva {
  tono: 'exito' | 'info' | 'error';
  texto: string;
}

export interface EstadoReserva {
  etiqueta: string;
  tono: 'espera' | 'pago' | 'confirmada' | 'cerrada';
}

const ESTADOS_RESERVA: Record<string, EstadoReserva> = {
  PENDIENTE_APROBACION: { etiqueta: 'Esperando aprobación', tono: 'espera' },
  PENDIENTE_PAGO: { etiqueta: 'Pendiente de pago', tono: 'pago' },
  CONFIRMADA: { etiqueta: 'Confirmada', tono: 'confirmada' },
  RECHAZADA: { etiqueta: 'Rechazada', tono: 'cerrada' },
  EXPIRADA: { etiqueta: 'Vencida', tono: 'cerrada' },
  CANCELADA: { etiqueta: 'Cancelada', tono: 'cerrada' },
  COMPLETADA: { etiqueta: 'Completada', tono: 'confirmada' },
};

const ESTADOS_CANCELABLES = ['PENDIENTE_APROBACION', 'PENDIENTE_PAGO', 'CONFIRMADA'];

export function estadoReserva(estado: string): EstadoReserva {
  return ESTADOS_RESERVA[estado] ?? { etiqueta: estado, tono: 'cerrada' };
}

export function cancelable(estado: string): boolean {
  return ESTADOS_CANCELABLES.includes(estado);
}

export function retencionVigente(retencionHasta: string | null, ahora = Date.now()): boolean {
  return !!retencionHasta && new Date(retencionHasta).getTime() > ahora;
}
