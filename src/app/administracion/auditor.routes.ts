import { Routes } from '@angular/router';
import { SECCIONES_AUDITOR } from './models/secciones.models';

export const AUDITOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/panel-administracion/panel-administracion').then(
        (m) => m.PanelAdministracion,
      ),
    data: { secciones: SECCIONES_AUDITOR, nombre: 'Secciones de auditoría' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'indicadores' },
      {
        path: 'indicadores',
        title: 'Indicadores',
        loadComponent: () =>
          import('./pages/panel-indicadores/panel-indicadores').then((m) => m.PanelIndicadores),
      },
      {
        path: 'eventos',
        title: 'Eventos de auditoría',
        loadComponent: () => import('./pages/auditoria/auditoria').then((m) => m.Auditoria),
      },
    ],
  },
];
