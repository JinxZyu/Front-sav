import { Routes } from '@angular/router';

export const NOTIFICACION_ROUTES: Routes = [
  {
    path: '',
    title: 'Notificaciones',
    loadComponent: () =>
      import('./pages/mis-notificaciones/mis-notificaciones').then((m) => m.MisNotificaciones),
  },
];
