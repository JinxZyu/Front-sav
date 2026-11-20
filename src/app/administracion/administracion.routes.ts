import { Routes } from '@angular/router';

export const ADMINISTRACION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/panel-administracion/panel-administracion').then(
        (m) => m.PanelAdministracion,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'indicadores' },
      {
        path: 'indicadores',
        title: 'Indicadores',
        loadComponent: () =>
          import('./pages/panel-indicadores/panel-indicadores').then((m) => m.PanelIndicadores),
      },
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
      {
        path: 'reportes',
        title: 'Reportes',
        loadComponent: () => import('./pages/reportes/reportes').then((m) => m.Reportes),
      },
      {
        path: 'auditoria',
        title: 'Auditoría',
        loadComponent: () => import('./pages/auditoria/auditoria').then((m) => m.Auditoria),
      },
      {
        path: 'reportes/:idExportacion',
        title: 'Reportes',
        loadComponent: () => import('./pages/reportes/reportes').then((m) => m.Reportes),
      },
    ],
  },
];
