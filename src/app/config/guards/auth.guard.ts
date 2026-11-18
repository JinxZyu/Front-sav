import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Rol } from '../auth/sesion.models';
import { SesionService } from '../auth/sesion.service';

export const autenticadoGuard: CanMatchFn = () => {
  const sesion = inject(SesionService);
  return sesion.autenticado() || inject(Router).parseUrl('/usuario/login');
};

export const rolGuard =
  (...roles: Rol[]): CanMatchFn =>
  () => {
    const sesion = inject(SesionService);
    const router = inject(Router);
    if (!sesion.autenticado()) {
      return router.parseUrl('/usuario/login');
    }
    return sesion.tieneRol(...roles) || router.parseUrl('/');
  };
