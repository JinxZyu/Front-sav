import { DISPONIBILIDAD_ROUTES } from './disponibilidad.routes';

describe('rutas del módulo disponibilidad', () => {
  it('la disponibilidad de una publicación carga su página', async () => {
    const ruta = DISPONIBILIDAD_ROUTES.find((opcion) => opcion.path === ':idPublicacion');
    expect(await (ruta?.loadComponent as () => Promise<unknown>)()).toBeDefined();
  });
});
