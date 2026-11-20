import { Routes } from '@angular/router';
import { rolGuard } from '../config/guards/auth.guard';

export const RESERVA_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Mis reservas',
    canMatch: [rolGuard('HUESPED')],
    loadComponent: () =>
      import('./pages/lista-reservas/lista-reservas').then((m) => m.ListaReservas),
  },
  {
    path: 'alojamientos',
    title: 'Reservas de mis alojamientos',
    canMatch: [rolGuard('ANFITRION')],
    data: { vista: 'anfitrion' },
    loadComponent: () =>
      import('./pages/lista-reservas/lista-reservas').then((m) => m.ListaReservas),
  },
  {
    path: 'alojamientos/:idReserva',
    title: 'Reserva',
    canMatch: [rolGuard('ANFITRION')],
    loadComponent: () =>
      import('./pages/detalle-solicitud/detalle-solicitud').then((m) => m.DetalleSolicitud),
  },
  {
    path: ':idReserva',
    title: 'Reserva',
    canMatch: [rolGuard('HUESPED')],
    loadComponent: () =>
      import('./pages/detalle-reserva/detalle-reserva').then((m) => m.DetalleReserva),
  },
];
