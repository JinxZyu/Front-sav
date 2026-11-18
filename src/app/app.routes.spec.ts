import { routes } from './app.routes';
import { USUARIO_ROUTES } from './usuario/usuario.routes';

describe('rutas de la aplicación', () => {
  it('cada módulo carga sus propias rutas', async () => {
    const modulos = routes.filter((ruta) => ruta.loadChildren);
    expect(modulos.length).toBe(7);
    for (const ruta of modulos) {
      const hijas = await (ruta.loadChildren as () => Promise<unknown>)();
      expect(Array.isArray(hijas)).toBe(true);
    }
  });

  it('la página principal lleva al inicio de sesión', () => {
    expect(routes[0]).toEqual({ path: '', pathMatch: 'full', redirectTo: 'usuario/login' });
    expect(USUARIO_ROUTES[0].children?.[0]).toEqual({
      path: '',
      pathMatch: 'full',
      redirectTo: 'login',
    });
  });

  it('una ruta desconocida lleva directo al inicio de sesión', () => {
    expect(routes.at(-1)).toEqual({ path: '**', redirectTo: 'usuario/login' });
  });
});
