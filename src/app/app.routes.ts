import { Routes } from '@angular/router';

/**
 * Cada módulo carga sus rutas solo cuando se visita (lazy loading),
 * igual que el backend separa sus módulos.
 */
export const routes: Routes = [
  {
    path: 'usuario',
    loadChildren: () => import('./modulos/usuario/usuario.routes').then((m) => m.USUARIO_ROUTES),
  },
  {
    path: 'publicaciones',
    loadChildren: () =>
      import('./modulos/publicacion/publicacion.routes').then((m) => m.PUBLICACION_ROUTES),
  },
  {
    path: 'alojamientos',
    loadChildren: () =>
      import('./modulos/alojamiento/alojamiento.routes').then((m) => m.ALOJAMIENTO_ROUTES),
  },
  {
    path: 'disponibilidad',
    loadChildren: () =>
      import('./modulos/disponibilidad/disponibilidad.routes').then((m) => m.DISPONIBILIDAD_ROUTES),
  },
  {
    path: 'cancelacion',
    loadChildren: () =>
      import('./modulos/cancelacion/cancelacion.routes').then((m) => m.CANCELACION_ROUTES),
  },
  {
    path: 'servicios',
    loadChildren: () => import('./modulos/servicio/servicio.routes').then((m) => m.SERVICIO_ROUTES),
  },
  {
    path: 'notificaciones',
    loadChildren: () =>
      import('./modulos/notificacion/notificacion.routes').then((m) => m.NOTIFICACION_ROUTES),
  },
  {
    path: 'reservas',
    loadChildren: () => import('./modulos/reserva/reserva.routes').then((m) => m.RESERVA_ROUTES),
  },
];
