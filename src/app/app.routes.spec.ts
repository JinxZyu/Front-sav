import { autenticadoGuard, paginaInicial } from './config/guards/auth.guard';
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

  it('la página principal depende de si hay sesión', () => {
    expect(routes[0]).toEqual({ path: '', pathMatch: 'full', redirectTo: paginaInicial });
    expect(USUARIO_ROUTES[1].children?.[0]).toEqual({
      path: '',
      pathMatch: 'full',
      redirectTo: 'login',
    });
  });

  it('una ruta desconocida lleva a la página principal', () => {
    expect(routes.at(-1)).toEqual({ path: '**', redirectTo: paginaInicial });
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

  it('criterio 4: la gestión de usuarios es solo para Administrador', async () => {
    const ruta = routes.find((opcion) => opcion.path === 'administracion/usuarios');
    expect(ruta?.canMatch).toHaveLength(1);
    expect(await (ruta?.loadComponent as () => Promise<unknown>)()).toBeDefined();
  });
});
