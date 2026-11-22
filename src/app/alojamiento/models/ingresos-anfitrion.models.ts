/** Totales del dinero de las reservas pagadas, ya descontadas las devoluciones por cancelaciones. */
export interface ResumenIngresos {
  pagadoPorHuespedes: number;
  devoluciones: number;
  ingresosNetos: number;
  comisionPlataforma: number;
  gananciasAnfitriones: number;
  reservasConPago: number;
}

export interface IngresoPublicacion {
  idPublicacion: string;
  titulo: string;
  reservasConPago: number;
  pagadoPorHuespedes: number;
  devoluciones: number;
  comisionPlataforma: number;
  ganancias: number;
}

export interface IngresosAnfitrion {
  resumen: ResumenIngresos;
  publicaciones: IngresoPublicacion[];
}
