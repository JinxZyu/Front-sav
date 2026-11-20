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

export interface IndicadoresDashboard {
  usuarios: IndicadoresUsuarios;
  publicacionesActivas: number;
  reservasPorEstado: Record<string, number>;
  ingresosEstimados: number;
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
