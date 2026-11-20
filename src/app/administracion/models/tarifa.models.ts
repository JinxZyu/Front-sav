export interface ConfiguracionTarifa {
  idConfiguracion: string;
  idAdministrador: string;
  porcentajeServicio: number;
  porcentajeDescuento: number;
  vigenteDesde: string;
  vigenteHasta: string | null;
  fechaCreacion: string;
}

export interface NuevaConfiguracionTarifa {
  porcentajeServicio: number;
  porcentajeDescuento: number;
}
