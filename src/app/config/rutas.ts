import { Rol } from './auth/sesion.models';

export const INICIO_CON_SESION = '/publicaciones';
export const INICIO_ANFITRION = '/alojamientos';
export const INICIO_SIN_SESION = '/usuario/login';
export const INICIO_PUBLICO = '/publicaciones';

export const inicioSegunRol = (rol: Rol | null): string =>
  rol === 'ANFITRION' ? INICIO_ANFITRION : INICIO_CON_SESION;
