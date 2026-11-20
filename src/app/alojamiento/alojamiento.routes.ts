import { Routes } from '@angular/router';

export const ALOJAMIENTO_ROUTES: Routes = [
  {
    path: '',
    title: 'Mis alojamientos',
    loadComponent: () =>
      import('./pages/mis-publicaciones/mis-publicaciones').then((m) => m.MisPublicaciones),
  },
  {
    path: 'nuevo',
    title: 'Publicar alojamiento',
    loadComponent: () =>
      import('./pages/crear-publicacion/crear-publicacion').then((m) => m.CrearPublicacion),
  },
  {
    path: ':idPublicacion',
    title: 'Detalle de publicación',
    loadComponent: () =>
      import('./pages/detalle-publicacion/detalle-publicacion').then((m) => m.DetallePublicacion),
  },
  {
    path: ':idPublicacion/editar',
    title: 'Editar publicación',
    loadComponent: () =>
      import('./pages/crear-publicacion/crear-publicacion').then((m) => m.CrearPublicacion),
  },
];
