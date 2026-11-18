import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment, UrlTree } from '@angular/router';
import { Rol } from '../auth/sesion.models';
import { SesionService } from '../auth/sesion.service';

const irAlLogin = (router: Router, segmentos: UrlSegment[]): UrlTree => {
  const destino = router.currentNavigation()?.extractedUrl;
  const volverA = destino
    ? router.serializeUrl(destino)
    : '/' + segmentos.map((segmento) => segmento.path).join('/');
  return router.createUrlTree(['/usuario/login'], { queryParams: { volverA } });
};

export const autenticadoGuard: CanMatchFn = (_ruta, segmentos) => {
  const sesion = inject(SesionService);
  return sesion.autenticado() || irAlLogin(inject(Router), segmentos);
};

export const rolGuard =
  (...roles: Rol[]): CanMatchFn =>
  (_ruta, segmentos) => {
    const sesion = inject(SesionService);
    const router = inject(Router);
    if (!sesion.autenticado()) {
      return irAlLogin(router, segmentos);
    }
    return sesion.tieneRol(...roles) || router.parseUrl('/');
  };
