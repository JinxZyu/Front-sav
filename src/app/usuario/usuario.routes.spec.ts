import { Route } from '@angular/router';
import { sinSesionGuard } from '../config/guards/auth.guard';
import { USUARIO_ROUTES } from './usuario.routes';

const cargar = async (ruta: Route): Promise<number> => {
  let cargados = 0;
  if (ruta.loadComponent) {
    expect(await (ruta.loadComponent as () => Promise<unknown>)()).toBeDefined();
    cargados++;
  }
  for (const hija of ruta.children ?? []) {
    cargados += await cargar(hija);
  }
  return cargados;
};

describe('rutas del módulo usuario', () => {
  it('el panel de acceso y cada página cargan su componente', async () => {
    let total = 0;
    for (const ruta of USUARIO_ROUTES) {
      total += await cargar(ruta);
    }
    expect(total).toBe(6);
  });

  it('el inicio de sesión y el registro no se abren con la sesión iniciada', () => {
    const panel = USUARIO_ROUTES.find((ruta) => ruta.path === '');
    expect(panel?.canActivate).toEqual([sinSesionGuard]);
  });
});
