import { Routes } from '@angular/router';

export const ALOJAMIENTO_ROUTES: Routes = [
  {
    path: 'nuevo',
    title: 'Publicar alojamiento',
    loadComponent: () =>
      import('./pages/crear-publicacion/crear-publicacion').then((m) => m.CrearPublicacion),
  },
];
