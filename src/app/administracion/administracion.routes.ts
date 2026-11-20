import { Routes } from '@angular/router';

export const ADMINISTRACION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/panel-administracion/panel-administracion').then(
        (m) => m.PanelAdministracion,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
      {
        path: 'usuarios',
        title: 'Usuarios',
        loadComponent: () =>
          import('./pages/gestion-usuarios/gestion-usuarios').then((m) => m.GestionUsuarios),
      },
    ],
  },
];
