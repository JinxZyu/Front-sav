export interface PeriodoDisponible {
  idPeriodo: string;
  idAlojamiento: string;
  fechaInicio: string;
  fechaFin: string;
  habilitado: boolean;
  fechaCreacion: string | null;
}

export interface NuevoPeriodo {
  fechaInicio: string;
  fechaFin: string;
}

export interface CalendarioDisponibilidad {
  idAlojamiento: string;
  periodos: PeriodoDisponible[];
  nochesOcupadas: string[];
}

export interface ConsultaDisponibilidad {
  idAlojamiento: string;
  fechaInicio: string;
  fechaFin: string;
  disponible: boolean;
  cubiertoPorPeriodosDisponibles: boolean;
  nochesOcupadas: string[];
}
