import { inject } from '@angular/core';
import { CanActivateChildFn, CanMatchFn, Router, UrlSegment, UrlTree } from '@angular/router';
import { Rol } from '../auth/sesion.models';
import { SesionService } from '../auth/sesion.service';
import { INICIO_CON_SESION, INICIO_SIN_SESION } from '../rutas';

const irAlLogin = (router: Router, segmentos: UrlSegment[]): UrlTree => {
  const destino = router.currentNavigation()?.extractedUrl;
  const volverA = destino
    ? router.serializeUrl(destino)
    : '/' + segmentos.map((segmento) => segmento.path).join('/');
  return router.createUrlTree([INICIO_SIN_SESION], { queryParams: { volverA } });
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
    return sesion.tieneRol(...roles) || router.parseUrl(INICIO_CON_SESION);
  };

export const sinSesionGuard: CanActivateChildFn = () =>
  !inject(SesionService).autenticado() || inject(Router).parseUrl(INICIO_CON_SESION);

export const paginaInicial = (): string =>
  inject(SesionService).autenticado() ? INICIO_CON_SESION : INICIO_SIN_SESION;
