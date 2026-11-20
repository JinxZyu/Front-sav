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
