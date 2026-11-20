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
}

export interface MisReservas {
  reservas: ReservaPropia[];
  totalResultados: number;
  mensaje: string | null;
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
};

export function estadoReserva(estado: string): EstadoReserva {
  return ESTADOS_RESERVA[estado] ?? { etiqueta: estado, tono: 'cerrada' };
}
