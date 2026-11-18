import { Routes } from '@angular/router';

export const USUARIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/panel-acceso/panel-acceso').then((m) => m.PanelAcceso),
    children: [
      {
        path: 'registro',
        title: 'Crear cuenta',
        loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro),
      },
      {
        path: 'verificar-correo',
        title: 'Verificar correo',
        loadComponent: () =>
          import('./pages/verificar-correo/verificar-correo').then((m) => m.VerificarCorreo),
      },
    ],
  },
];
