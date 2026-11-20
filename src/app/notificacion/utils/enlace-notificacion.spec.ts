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

  it('al auditor de operación no lo lleva a reservas ni publicaciones', () => {
    expect(enlaceNotificacion(notificacion(), 'AUDITOR_OPERACION')).toBeNull();
  });

  it('lleva al administrador al reporte que pidió', () => {
    const reporte = notificacion({
      idReserva: null,
      idPublicacion: null,
      tipo: 'EXPORTACION_REPORTE',
      mensaje:
        'El reporte está listo para descargar. Identificador: 3f2b8c1d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
    });
    expect(enlaceNotificacion(reporte, 'ADMINISTRADOR')).toEqual({
      ruta: ['/administracion/reportes', '3f2b8c1d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'],
      texto: 'Ver reporte',
    });
    expect(enlaceNotificacion(reporte, 'ANFITRION')).toBeNull();
    expect(
      enlaceNotificacion({ ...reporte, mensaje: 'El reporte está listo.' }, 'ADMINISTRADOR'),
    ).toBeNull();
  });

  it('sin reserva ni publicación no ofrece enlace', () => {
    expect(
      enlaceNotificacion(notificacion({ idReserva: null, idPublicacion: null }), 'HUESPED'),
    ).toBeNull();
  });
});
