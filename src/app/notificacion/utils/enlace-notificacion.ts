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

const RUTAS_PUBLICACION: Record<Rol, string> = {
  ANFITRION: '/alojamientos',
  ADMINISTRADOR: '/administracion/publicaciones',
  HUESPED: '/publicaciones',
};

export function enlaceNotificacion(
  notificacion: Notificacion,
  rol: Rol | null,
): EnlaceNotificacion | null {
  const rutaReserva = rol ? RUTAS_RESERVA[rol] : undefined;
  if (notificacion.idReserva && rutaReserva) {
    return { ruta: [rutaReserva, notificacion.idReserva], texto: 'Ver reserva' };
  }
  if (notificacion.idPublicacion) {
    return {
      ruta: [RUTAS_PUBLICACION[rol ?? 'HUESPED'], notificacion.idPublicacion],
      texto: 'Ver publicación',
    };
  }
  return null;
}
