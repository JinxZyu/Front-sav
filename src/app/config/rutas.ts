import { Rol } from './auth/sesion.models';

export const INICIO_CON_SESION = '/publicaciones';
export const INICIO_ANFITRION = '/alojamientos';
export const INICIO_ADMINISTRADOR = '/administracion';
export const INICIO_AUDITOR = '/auditoria';
export const INICIO_SIN_SESION = '/usuario/login';
export const INICIO_PUBLICO = '/publicaciones';

const INICIO_POR_ROL: Partial<Record<Rol, string>> = {
  ANFITRION: INICIO_ANFITRION,
  ADMINISTRADOR: INICIO_ADMINISTRADOR,
  AUDITOR_OPERACION: INICIO_AUDITOR,
};

export const inicioSegunRol = (rol: Rol | null): string =>
  (rol && INICIO_POR_ROL[rol]) ?? INICIO_CON_SESION;
