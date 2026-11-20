import { Routes } from '@angular/router';

export const PUBLICACION_ROUTES: Routes = [
  {
    path: '',
    title: 'Alojamientos',
    loadComponent: () => import('./pages/catalogo/catalogo').then((m) => m.Catalogo),
  },
  {
    path: ':idPublicacion',
    title: 'Alojamiento',
    loadComponent: () =>
      import('./pages/detalle-publico/detalle-publico').then((m) => m.DetallePublico),
  },
];
