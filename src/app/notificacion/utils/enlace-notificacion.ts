import { Rol } from '../../config/auth/sesion.models';
import { Notificacion } from '../models/notificacion.models';

export interface EnlaceNotificacion {
  ruta: string[];
  texto: string;
}

const RUTAS_RESERVA: Partial<Record<Rol, string>> = {
  ANFITRION: '/reservas/alojamientos',
  HUESPED: '/reservas',
};

const RUTAS_PUBLICACION: Partial<Record<Rol, string>> = {
  ANFITRION: '/alojamientos',
  ADMINISTRADOR: '/administracion/publicaciones',
  HUESPED: '/publicaciones',
};

const TIPO_EXPORTACION = 'EXPORTACION_REPORTE';
const IDENTIFICADOR = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function enlaceNotificacion(
  notificacion: Notificacion,
  rol: Rol | null,
): EnlaceNotificacion | null {
  if (notificacion.tipo === TIPO_EXPORTACION) {
    const idExportacion = IDENTIFICADOR.exec(notificacion.mensaje)?.[0];
    return rol === 'ADMINISTRADOR' && idExportacion
      ? { ruta: ['/administracion/reportes', idExportacion], texto: 'Ver reporte' }
      : null;
  }
  const rutaReserva = rol ? RUTAS_RESERVA[rol] : undefined;
  if (notificacion.idReserva && rutaReserva) {
    return { ruta: [rutaReserva, notificacion.idReserva], texto: 'Ver reserva' };
  }
  const rutaPublicacion = RUTAS_PUBLICACION[rol ?? 'HUESPED'];
  if (notificacion.idPublicacion && rutaPublicacion) {
    return {
      ruta: [rutaPublicacion, notificacion.idPublicacion],
      texto: 'Ver publicación',
    };
  }
  return null;
}
