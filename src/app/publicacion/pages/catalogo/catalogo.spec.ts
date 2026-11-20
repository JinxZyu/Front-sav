import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { crearToken } from '../../../config/auth/sesion.testing';
import { Catalogo } from './catalogo';

describe('Catalogo (HU-024)', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;
  const busqueda = `${environment.apiUrl}/publicaciones/busqueda`;
  const catalogo = `${environment.apiUrl}/publicaciones/catalogo`;
  const servicios = `${environment.apiUrl}/servicios`;
  const miCuenta = `${environment.apiUrl}/usuarios/mi_cuenta`;

  const resumen = (id: string, titulo: string, ciudad = 'Bogotá', codigoPais?: string) => ({
    idPublicacion: id,
    idAlojamiento: `a-${id}`,
    titulo,
    ciudad,
    tipoAlojamiento: 'Apartamento',
    capacidad: 2,
    precioPorNoche: 180000,
    estado: 'ACTIVA',
    fechaCreacion: '2026-11-18T10:00:00-05:00',
    codigoPais,
  });

  const variosPaises = [
    resumen('p-1', 'Loft en Chapinero', 'Bogotá', 'CO'),
    resumen('p-2', 'Depa en Miraflores', 'Lima', 'PE'),
    resumen('p-3', 'Casa en El Poblado', 'Medellín', 'CO'),
    resumen('p-4', 'Hostal en San Blas', 'Cusco', 'PE'),
    resumen('p-5', 'Estudio en Barranco', 'lima', 'PE'),
  ];

  const todas = [
    resumen('p-1', 'Loft en Chapinero'),
    resumen('p-2', 'Casa en El Poblado', 'Medellín'),
    resumen('p-3', 'Estudio en Usaquén', 'bogota'),
    resumen('p-4', 'Casa colonial', 'Cartagena'),
  ];

  const pagina = (cambios: object = {}) => ({
    publicaciones: [resumen('p-1', 'Loft en Chapinero')],
    pagina: 0,
    tamano: 12,
    totalResultados: 1,
    totalPaginas: 1,
    mensaje: '',
    ...cambios,
  });

  const listaServicios = [
    { idServicio: 's-1', nombre: 'Wifi', descripcion: null },
    { idServicio: 's-2', nombre: 'Piscina', descripcion: null },
  ];

  const abrir = async (
    url = '/publicaciones',
    opciones: { fallanServicios?: boolean; catalogo?: object; estado?: number } = {},
  ) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'publicaciones', component: Catalogo }]),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create(url);
    if (opciones.fallanServicios) {
      backend.expectOne(servicios).flush(null, { status: 500, statusText: 'Error' });
    } else {
      backend.expectOne(servicios).flush(listaServicios);
    }
    if (opciones.estado) {
      backend
        .expectOne(catalogo)
        .flush(
          { mensaje: 'Servicio no disponible.' },
          { status: opciones.estado, statusText: 'X' },
        );
    } else {
      backend.expectOne(catalogo).flush(opciones.catalogo ?? todas);
    }
  };

  const esperarBusqueda = () => backend.expectOne((peticion) => peticion.url === busqueda);

  const refrescar = async () => {
    await new Promise((resolver) => setTimeout(resolver));
    harness.detectChanges();
    TestBed.tick();
  };

  const elemento = () => harness.routeNativeElement as HTMLElement;
  const campo = <T extends HTMLElement>(selector: string) =>
    elemento().querySelector<T>(selector) as T;
  const escribir = (selector: string, valor: string) => {
    const entrada = campo<HTMLInputElement | HTMLSelectElement>(selector);
    entrada.value = valor;
    entrada.dispatchEvent(new Event(entrada.tagName === 'SELECT' ? 'change' : 'input'));
  };
  const boton = (texto: string) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('button')].find(
      (actual) => actual.textContent?.trim() === texto,
    ) as HTMLButtonElement;
  const abrirAvanzada = async () => {
    campo<HTMLButtonElement>('button.alternar').click();
    await refrescar();
  };

  const titulosCarruseles = () =>
    [...elemento().querySelectorAll('app-carrusel-publicaciones h2')].map((h2) =>
      h2.textContent?.trim(),
    );

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  it('criterio 1: sin filtros muestra carruseles de los recientes y por ciudad', async () => {
    await abrir();
    await refrescar();

    backend.expectNone((peticion) => peticion.url === busqueda);
    const titulos = [...elemento().querySelectorAll('app-carrusel-publicaciones h2')].map((h2) =>
      h2.textContent?.trim(),
    );
    expect(titulos).toEqual([
      'Publicados recientemente',
      'Alojamientos en Bogotá',
      'Alojamientos en Cartagena',
      'Alojamientos en Medellín',
    ]);
    const bogota = elemento().querySelectorAll('app-carrusel-publicaciones')[1];
    expect(bogota.querySelectorAll('a.tarjeta')).toHaveLength(2);
    expect(bogota.querySelector('h2 a')?.getAttribute('href')).toBe(
      '/publicaciones?ciudad=Bogot%C3%A1',
    );
    expect(campo<HTMLAnchorElement>('a.tarjeta').getAttribute('href')).toBe('/publicaciones/p-1');
    expect(
      [...elemento().querySelectorAll('#ciudades-sugeridas option')].map((opcion) =>
        opcion.getAttribute('value'),
      ),
    ).toEqual(['Bogotá', 'Cartagena', 'Medellín']);
    expect(elemento().querySelector('#busqueda-avanzada')).toBeNull();
  });

  it('avisa cuando todavía no hay alojamientos publicados', async () => {
    await abrir('/publicaciones', { catalogo: [] });
    await refrescar();
    expect(elemento().textContent).toContain('Todavía no hay alojamientos publicados');
  });

  it('si falla el catálogo permite reintentar', async () => {
    await abrir('/publicaciones', { estado: 503 });
    await refrescar();

    expect(campo('[role="alert"]').textContent).toContain('Servicio no disponible.');
    boton('Reintentar').click();
    await refrescar();
    backend.expectOne(catalogo).flush(todas);
    await refrescar();
    expect(elemento().querySelectorAll('app-carrusel-publicaciones').length).toBe(4);
  });

  it('criterio 2: lee los filtros de la URL, los envía y los conserva en el detalle', async () => {
    await abrir(
      '/publicaciones?ciudad=Bogot%C3%A1&llegada=2026-12-04&salida=2026-12-06&huespedes=2&servicios=s-1,s-2',
    );
    const peticion = esperarBusqueda();
    const params = peticion.request.params;
    expect(params.get('ciudad')).toBe('Bogotá');
    expect(params.get('fechaInicio')).toBe('2026-12-04');
    expect(params.get('fechaFin')).toBe('2026-12-06');
    expect(params.get('capacidad')).toBe('2');
    expect(params.getAll('servicios')).toEqual(['s-1', 's-2']);
    expect(params.get('pagina')).toBe('0');
    expect(params.get('tamano')).toBe('12');
    peticion.flush(pagina());
    await refrescar();

    expect(elemento().textContent).toContain('1 alojamiento disponible');
    expect(elemento().querySelector('app-carrusel-publicaciones')).toBeNull();
    expect(campo<HTMLInputElement>('input[formcontrolname="ciudad"]').value).toBe('Bogotá');
    expect(campo('button.alternar').getAttribute('aria-expanded')).toBe('true');
    expect(campo('.contador').textContent?.trim()).toBe('2');
    expect(elemento().querySelectorAll('.servicio.marcado').length).toBe(2);
    expect(campo<HTMLAnchorElement>('a.tarjeta').getAttribute('href')).toBe(
      '/publicaciones/p-1?llegada=2026-12-04&salida=2026-12-06&huespedes=2',
    );
  });

  it('criterio 3: buscar lleva los filtros a la URL y consulta', async () => {
    await abrir();
    await refrescar();

    escribir('input[formcontrolname="ciudad"]', '  Medellín ');
    await abrirAvanzada();
    escribir('select[formcontrolname="tipo"]', 'Casa');
    escribir('input[formcontrolname="precioMaximo"]', '300000');
    campo<HTMLInputElement>('.servicio input').click();
    boton('Buscar').click();
    await refrescar();

    expect(TestBed.inject(Router).url).toBe(
      '/publicaciones?ciudad=Medell%C3%ADn&tipo=Casa&max=300000&servicios=s-1',
    );
    const params = esperarBusqueda().request.params;
    expect(params.get('ciudad')).toBe('Medellín');
    expect(params.get('tipoAlojamiento')).toBe('Casa');
    expect(params.get('precioMaximo')).toBe('300000');
    expect(params.getAll('servicios')).toEqual(['s-1']);
  });

  it('criterio 4: no busca con fechas o precios incoherentes', async () => {
    await abrir();
    await refrescar();

    escribir('input[formcontrolname="llegada"]', '2026-12-10');
    escribir('input[formcontrolname="salida"]', '2026-12-08');
    await abrirAvanzada();
    escribir('input[formcontrolname="precioMinimo"]', '500000');
    escribir('input[formcontrolname="precioMaximo"]', '100000');
    boton('Aplicar filtros').click();
    await refrescar();

    expect(elemento().textContent).toContain('La salida debe ser posterior a la llegada.');
    expect(elemento().textContent).toContain('Debe ser mayor o igual al mínimo.');
    expect(TestBed.inject(Router).url).toBe('/publicaciones');
  });

  it('criterio 5: informa cuando no hay resultados y permite limpiar los filtros', async () => {
    await abrir('/publicaciones?ciudad=Leticia');
    esperarBusqueda().flush(pagina({ publicaciones: [], totalResultados: 0, totalPaginas: 0 }));
    await refrescar();

    expect(elemento().textContent).toContain('No encontramos alojamientos con esos filtros');
    boton('Limpiar filtros').click();
    await refrescar();

    expect(TestBed.inject(Router).url).toBe('/publicaciones');
    backend.expectNone((peticion) => peticion.url === busqueda);
    expect(campo<HTMLInputElement>('input[formcontrolname="ciudad"]').value).toBe('');
    expect(elemento().querySelectorAll('app-carrusel-publicaciones').length).toBe(4);
  });

  it('criterio 6: pagina los resultados conservando los filtros', async () => {
    await abrir('/publicaciones?ciudad=Bogot%C3%A1');
    esperarBusqueda().flush(pagina({ totalResultados: 30, totalPaginas: 3 }));
    await refrescar();

    expect(elemento().textContent).toContain('Página 1 de 3');
    expect(boton('Anterior').disabled).toBe(true);
    boton('Siguiente').click();
    await refrescar();

    const params = esperarBusqueda().request.params;
    expect(params.get('pagina')).toBe('1');
    expect(params.get('ciudad')).toBe('Bogotá');
  });

  it('muestra el error de la búsqueda y permite reintentar', async () => {
    await abrir('/publicaciones?ciudad=Cali');
    esperarBusqueda().flush(
      { mensaje: 'Servicio no disponible.' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await refrescar();

    expect(campo('[role="alert"]').textContent).toContain('Servicio no disponible.');
    boton('Reintentar').click();
    await refrescar();
    esperarBusqueda().flush(pagina());
  });

  it('envía un precio máximo de cero y omite los campos vacíos', async () => {
    await abrir();
    await refrescar();

    await abrirAvanzada();
    escribir('input[formcontrolname="precioMinimo"]', '0');
    escribir('input[formcontrolname="precioMaximo"]', '0');
    boton('Aplicar filtros').click();
    await refrescar();

    expect(TestBed.inject(Router).url).toBe('/publicaciones?min=0&max=0');
    const params = esperarBusqueda().request.params;
    expect(params.get('precioMinimo')).toBe('0');
    expect(params.get('precioMaximo')).toBe('0');
    expect(params.has('ciudad')).toBe(false);
  });

  it('limpiar borra lo escrito aunque aún no se haya buscado', async () => {
    await abrir();
    await refrescar();
    expect(boton('Limpiar filtros')).toBeUndefined();

    escribir('input[formcontrolname="ciudad"]', 'Cali');
    await abrirAvanzada();
    campo<HTMLInputElement>('.servicio input').click();
    await refrescar();
    boton('Limpiar filtros').click();
    await refrescar();

    expect(campo<HTMLInputElement>('input[formcontrolname="ciudad"]').value).toBe('');
    expect(elemento().querySelectorAll('.servicio.marcado').length).toBe(0);
    expect(TestBed.inject(Router).url).toBe('/publicaciones');
  });

  it('permite reintentar la carga de los servicios sin afectar la búsqueda', async () => {
    await abrir('/publicaciones?ciudad=Bogot%C3%A1', { fallanServicios: true });
    esperarBusqueda().flush(pagina());
    await refrescar();
    await abrirAvanzada();

    expect(elemento().querySelector('.aviso-servicios')?.textContent).toContain(
      'No pudimos cargar los servicios',
    );
    expect(elemento().querySelectorAll('a.tarjeta').length).toBe(1);
    elemento().querySelector<HTMLButtonElement>('.aviso-servicios button')!.click();
    await refrescar();
    backend.expectOne(servicios).flush(listaServicios);
    await refrescar();

    expect(elemento().querySelector('.aviso-servicios')).toBeNull();
    expect(elemento().querySelectorAll('.servicio').length).toBe(2);
  });

  it('con sesión muestra primero el país y la ciudad de la cuenta', async () => {
    localStorage.setItem(
      'marketplace.token',
      crearToken({
        sub: 'ana@correo.com',
        role: 'HUESPED',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    await abrir('/publicaciones', { catalogo: variosPaises });
    backend.expectOne(miCuenta).flush({ ciudad: 'Lima', pais: 'Perú', codigoPais: 'PE' });
    await refrescar();

    expect(titulosCarruseles()).toEqual([
      'Publicados recientemente',
      'Cerca de ti en Lima',
      'Alojamientos en Cusco',
      'Alojamientos en Colombia',
    ]);
    const carruseles = elemento().querySelectorAll('app-carrusel-publicaciones');
    expect(carruseles[0].querySelectorAll('a.tarjeta')).toHaveLength(3);
    expect(carruseles[1].querySelectorAll('a.tarjeta')).toHaveLength(2);
    expect(carruseles[3].querySelectorAll('a.tarjeta')).toHaveLength(2);
    expect(carruseles[3].querySelector('h2 a')).toBeNull();
  });

  it('sin sesión toma el país del idioma del navegador', async () => {
    const idiomas = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['es-PE', 'es']);
    try {
      await abrir('/publicaciones', { catalogo: variosPaises });
      await refrescar();

      backend.expectNone(miCuenta);
      expect(titulosCarruseles()).toEqual([
        'Publicados recientemente',
        'Alojamientos en Lima',
        'Alojamientos en Cusco',
        'Alojamientos en Colombia',
      ]);
    } finally {
      idiomas.mockRestore();
    }
  });

  it('si el país del visitante no tiene alojamientos usa el que tiene más', async () => {
    const idiomas = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['es-MX']);
    try {
      await abrir('/publicaciones', { catalogo: variosPaises });
      await refrescar();

      expect(titulosCarruseles()).toEqual([
        'Publicados recientemente',
        'Alojamientos en Lima',
        'Alojamientos en Cusco',
        'Alojamientos en Colombia',
      ]);
    } finally {
      idiomas.mockRestore();
    }
  });
});
