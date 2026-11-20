import { Routes } from '@angular/router';
import { autenticadoGuard, paginaInicial, rolGuard } from './config/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: paginaInicial },
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
    canMatch: [rolGuard('ANFITRION')],
    loadChildren: () =>
      import('./alojamiento/alojamiento.routes').then((m) => m.ALOJAMIENTO_ROUTES),
  },
  {
    path: 'disponibilidad',
    canMatch: [rolGuard('ANFITRION')],
    loadChildren: () =>
      import('./disponibilidad/disponibilidad.routes').then((m) => m.DISPONIBILIDAD_ROUTES),
  },
  {
    path: 'cancelacion',
    canMatch: [autenticadoGuard],
    loadChildren: () =>
      import('./cancelacion/cancelacion.routes').then((m) => m.CANCELACION_ROUTES),
  },
  {
    path: 'notificaciones',
    canMatch: [autenticadoGuard],
    loadChildren: () =>
      import('./notificacion/notificacion.routes').then((m) => m.NOTIFICACION_ROUTES),
  },
  {
    path: 'reservas',
    canMatch: [autenticadoGuard],
    loadChildren: () => import('./reserva/reserva.routes').then((m) => m.RESERVA_ROUTES),
  },
  {
    path: 'administracion',
    canMatch: [rolGuard('ADMINISTRADOR')],
    loadChildren: () =>
      import('./administracion/administracion.routes').then((m) => m.ADMINISTRACION_ROUTES),
  },
  { path: '**', redirectTo: paginaInicial },
];
