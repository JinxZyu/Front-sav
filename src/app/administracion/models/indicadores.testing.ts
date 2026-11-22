import { IndicadoresDashboard } from './indicadores.models';

export const indicadores = (cambios: Partial<IndicadoresDashboard> = {}): IndicadoresDashboard => ({
  usuarios: { total: 120, activos: 110, huespedes: 80, anfitriones: 35 },
  publicacionesActivas: 42,
  reservasPorEstado: {
    PENDIENTE_PAGO: 2,
    PENDIENTE_APROBACION: 4,
    CONFIRMADA: 10,
    RECHAZADA: 1,
    CANCELADA: 3,
    COMPLETADA: 25,
    EXPIRADA: 0,
  },
  ingresosEstimados: 15250000,
  finanzas: {
    pagadoPorHuespedes: 15250000,
    devoluciones: 1250000,
    ingresosNetos: 14000000,
    comisionPlataforma: 1100000,
    gananciasAnfitriones: 12900000,
    reservasConPago: 38,
  },
  ciudadesConMayorDemanda: [
    { ciudad: 'Bogotá', solicitudesCotizacion: 30 },
    { ciudad: 'Medellín', solicitudesCotizacion: 12 },
  ],
  fechaCorteDatos: '2026-11-20T15:00:00Z',
  ...cambios,
});
