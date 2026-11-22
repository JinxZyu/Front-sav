export interface IndicadoresUsuarios {
  total: number;
  activos: number;
  huespedes: number;
  anfitriones: number;
}

export interface DemandaCiudad {
  ciudad: string;
  solicitudesCotizacion: number;
}

/** Lo que pagaron los huéspedes, lo devuelto por cancelaciones y cómo se reparte entre la plataforma y los anfitriones. */
export interface ResumenFinanciero {
  pagadoPorHuespedes: number;
  devoluciones: number;
  ingresosNetos: number;
  comisionPlataforma: number;
  gananciasAnfitriones: number;
  reservasConPago: number;
}

export interface IndicadoresDashboard {
  usuarios: IndicadoresUsuarios;
  publicacionesActivas: number;
  reservasPorEstado: Record<string, number>;
  ingresosEstimados: number;
  finanzas: ResumenFinanciero;
  ciudadesConMayorDemanda: DemandaCiudad[];
  fechaCorteDatos: string;
}

export interface BarraIndicador {
  etiqueta: string;
  valor: number;
}

export const ORDEN_ESTADOS_RESERVA = [
  'PENDIENTE_APROBACION',
  'PENDIENTE_PAGO',
  'CONFIRMADA',
  'COMPLETADA',
  'CANCELADA',
  'RECHAZADA',
  'EXPIRADA',
];
