import { routes } from './app.routes';

describe('rutas de la aplicación', () => {
  it('cada módulo carga sus propias rutas', async () => {
    for (const ruta of routes) {
      expect(ruta.loadChildren).toBeDefined();
      const hijas = await (ruta.loadChildren as () => Promise<unknown>)();
      expect(Array.isArray(hijas)).toBe(true);
    }
  });
});
