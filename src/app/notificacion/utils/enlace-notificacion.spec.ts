import { notificacion } from '../models/notificacion.testing';
import { enlaceNotificacion } from './enlace-notificacion';

describe('enlaceNotificacion', () => {
  it('lleva a la reserva según el rol', () => {
    expect(enlaceNotificacion(notificacion(), 'HUESPED')).toEqual({
      ruta: ['/reservas', 'r-1'],
      texto: 'Ver reserva',
    });
    expect(enlaceNotificacion(notificacion(), 'ANFITRION')?.ruta).toEqual([
      '/reservas/alojamientos',
      'r-1',
    ]);
  });

  it('lleva a la publicación según el rol', () => {
    const sinReserva = notificacion({ idReserva: null });
    expect(enlaceNotificacion(sinReserva, 'HUESPED')).toEqual({
      ruta: ['/publicaciones', 'p-1'],
      texto: 'Ver publicación',
    });
    expect(enlaceNotificacion(sinReserva, 'ANFITRION')?.ruta).toEqual(['/alojamientos', 'p-1']);
    expect(enlaceNotificacion(sinReserva, 'ADMINISTRADOR')?.ruta).toEqual([
      '/administracion/publicaciones',
      'p-1',
    ]);
    expect(enlaceNotificacion(sinReserva, null)?.ruta).toEqual(['/publicaciones', 'p-1']);
  });

  it('al administrador no lo lleva a reservas que no puede abrir', () => {
    expect(enlaceNotificacion(notificacion(), 'ADMINISTRADOR')?.ruta).toEqual([
      '/administracion/publicaciones',
      'p-1',
    ]);
    expect(enlaceNotificacion(notificacion({ idPublicacion: null }), 'ADMINISTRADOR')).toBeNull();
  });

  it('sin reserva ni publicación no ofrece enlace', () => {
    expect(
      enlaceNotificacion(notificacion({ idReserva: null, idPublicacion: null }), 'HUESPED'),
    ).toBeNull();
  });
});
