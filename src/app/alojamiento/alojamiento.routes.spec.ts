import { ALOJAMIENTO_ROUTES } from './alojamiento.routes';

describe('rutas del módulo alojamiento', () => {
  const cargar = (path: string) => {
    const ruta = ALOJAMIENTO_ROUTES.find((opcion) => opcion.path === path);
    return (ruta?.loadComponent as () => Promise<unknown>)();
  };

  it('el listado de mis alojamientos carga su componente', async () => {
    expect(await cargar('')).toBeDefined();
  });

  it('la página para publicar carga su componente', async () => {
    expect(await cargar('nuevo')).toBeDefined();
  });

  it('el detalle de una publicación carga su componente', async () => {
    expect(await cargar(':idPublicacion')).toBeDefined();
  });

  it('la página para publicar va antes del detalle para que no se tome como un id', () => {
    const rutas = ALOJAMIENTO_ROUTES.map((ruta) => ruta.path);
    expect(rutas.indexOf('nuevo')).toBeLessThan(rutas.indexOf(':idPublicacion'));
  });
});
