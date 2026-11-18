import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'usuario/login' },
  {
    path: 'usuario',
    loadChildren: () => import('./usuario/usuario.routes').then((m) => m.USUARIO_ROUTES),
  },
  {
    path: 'publicaciones',
    loadChildren: () =>
      import('./publicacion/publicacion.routes').then((m) => m.PUBLICACION_ROUTES),
  },
  {
    path: 'alojamientos',
    loadChildren: () =>
      import('./alojamiento/alojamiento.routes').then((m) => m.ALOJAMIENTO_ROUTES),
  },
  {
    path: 'disponibilidad',
    loadChildren: () =>
      import('./disponibilidad/disponibilidad.routes').then((m) => m.DISPONIBILIDAD_ROUTES),
  },
  {
    path: 'cancelacion',
    loadChildren: () =>
      import('./cancelacion/cancelacion.routes').then((m) => m.CANCELACION_ROUTES),
  },
  {
    path: 'notificaciones',
    loadChildren: () =>
      import('./notificacion/notificacion.routes').then((m) => m.NOTIFICACION_ROUTES),
  },
  {
    path: 'reservas',
    loadChildren: () => import('./reserva/reserva.routes').then((m) => m.RESERVA_ROUTES),
  },
  { path: '**', redirectTo: 'usuario/login' },
];
