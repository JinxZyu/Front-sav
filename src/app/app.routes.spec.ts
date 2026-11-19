import { autenticadoGuard } from './config/guards/auth.guard';
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

  it('protege los módulos privados por sesión o por rol', () => {
    const ruta = (path: string) => routes.find((opcion) => opcion.path === path);
    for (const path of ['cancelacion', 'notificaciones', 'reservas']) {
      expect(ruta(path)?.canMatch).toEqual([autenticadoGuard]);
    }
    for (const path of ['alojamientos', 'disponibilidad']) {
      expect(ruta(path)?.canMatch).toHaveLength(1);
    }
    for (const path of ['usuario', 'publicaciones']) {
      expect(ruta(path)?.canMatch).toBeUndefined();
    }
  });

});
