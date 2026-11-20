import { Routes } from '@angular/router';

export const DISPONIBILIDAD_ROUTES: Routes = [
  {
    path: ':idPublicacion',
    title: 'Disponibilidad',
    loadComponent: () =>
      import('./pages/disponibilidad-alojamiento/disponibilidad-alojamiento').then(
        (m) => m.DisponibilidadAlojamiento,
      ),
  },
];
