import { Routes } from '@angular/router';

export const PUBLICACION_ROUTES: Routes = [
  {
    path: '',
    title: 'Alojamientos',
    loadComponent: () => import('./pages/catalogo/catalogo').then((m) => m.Catalogo),
  },
];
