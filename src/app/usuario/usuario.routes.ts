import { Routes } from '@angular/router';
import { autenticadoGuard, sinSesionGuard } from '../config/guards/auth.guard';

export const USUARIO_ROUTES: Routes = [
  {
    path: 'mi-cuenta',
    title: 'Mi cuenta',
    canMatch: [autenticadoGuard],
    loadComponent: () => import('./pages/mi-cuenta/mi-cuenta').then((m) => m.MiCuenta),
  },
  {
    path: '',
    canActivateChild: [sinSesionGuard],
    loadComponent: () =>
      import('./components/panel-acceso/panel-acceso').then((m) => m.PanelAcceso),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        title: 'Iniciar sesión',
        loadComponent: () => import('./pages/login/login').then((m) => m.Login),
      },
      {
        path: 'registro',
        title: 'Crear cuenta',
        loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro),
      },
      {
        path: 'recuperar-contrasena',
        title: 'Recuperar contraseña',
        loadComponent: () =>
          import('./pages/recuperar-contrasena/recuperar-contrasena').then(
            (m) => m.RecuperarContrasena,
          ),
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
