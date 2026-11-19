import { PUBLICACION_ROUTES } from './publicacion.routes';

describe('rutas del módulo publicación', () => {
  it('la página principal de alojamientos carga su componente', async () => {
    const ruta = PUBLICACION_ROUTES.find((opcion) => opcion.path === '');
    expect(await (ruta?.loadComponent as () => Promise<unknown>)()).toBeDefined();
  });
});
