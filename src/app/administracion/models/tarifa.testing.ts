import { ConfiguracionTarifa } from './tarifa.models';

export const configuracionTarifa = (
  cambios: Partial<ConfiguracionTarifa> = {},
): ConfiguracionTarifa => ({
  idConfiguracion: 't-1',
  idAdministrador: 'u-admin',
  porcentajeServicio: 10,
  porcentajeDescuento: 0,
  vigenteDesde: '2026-11-15T15:30:00Z',
  vigenteHasta: null,
  fechaCreacion: '2026-11-15T15:30:00Z',
  ...cambios,
});
