import { ALOJAMIENTO_ROUTES } from './alojamiento.routes';

describe('rutas del módulo alojamiento', () => {
  it('la página para publicar carga su componente', async () => {
    const ruta = ALOJAMIENTO_ROUTES.find((opcion) => opcion.path === 'nuevo');
    expect(await (ruta?.loadComponent as () => Promise<unknown>)()).toBeDefined();
  });
});
