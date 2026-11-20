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
      {
        path: 'publicaciones',
        title: 'Publicaciones',
        loadComponent: () =>
          import('./pages/lista-publicaciones/lista-publicaciones').then(
            (m) => m.ListaPublicaciones,
          ),
      },
      {
        path: 'publicaciones/:idPublicacion',
        title: 'Revisar publicación',
        loadComponent: () =>
          import('./pages/revision-publicacion/revision-publicacion').then(
            (m) => m.RevisionPublicacion,
          ),
      },
      {
        path: 'tarifas',
        title: 'Tarifas',
        loadComponent: () =>
          import('./pages/configuracion-tarifas/configuracion-tarifas').then(
            (m) => m.ConfiguracionTarifas,
          ),
      },
    ],
  },
];
