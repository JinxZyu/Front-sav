import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { Catalogo } from './catalogo';

describe('Catalogo (HU-024)', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;
  const busqueda = `${environment.apiUrl}/publicaciones/busqueda`;
  const servicios = `${environment.apiUrl}/servicios`;

  const resumen = (id: string, titulo: string) => ({
    idPublicacion: id,
    idAlojamiento: `a-${id}`,
    titulo,
    ciudad: 'Bogotá',
    tipoAlojamiento: 'Apartamento',
    capacidad: 2,
    precioPorNoche: 180000,
    estado: 'ACTIVA',
    fechaCreacion: '2026-11-18T10:00:00-05:00',
  });

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

  const abrir = async (url = '/publicaciones', fallanServicios = false) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'publicaciones', component: Catalogo }]),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create(url);
    if (fallanServicios) {
      backend.expectOne(servicios).flush(null, { status: 500, statusText: 'Error' });
    } else {
      backend.expectOne(servicios).flush(listaServicios);
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

  afterEach(() => backend.verify());

  it('criterio 1: sin filtros lista las publicaciones activas con enlace al detalle', async () => {
    await abrir();
    const peticion = esperarBusqueda();
    expect(peticion.request.params.get('pagina')).toBe('0');
    expect(peticion.request.params.get('tamano')).toBe('12');
    expect(peticion.request.params.has('ciudad')).toBe(false);
    peticion.flush(pagina());
    await refrescar();

    expect(elemento().textContent).toContain('1 alojamiento disponible');
    const tarjeta = campo<HTMLAnchorElement>('a.tarjeta');
    expect(tarjeta.textContent).toContain('Loft en Chapinero');
    expect(tarjeta.getAttribute('href')).toBe('/publicaciones/p-1');
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
    peticion.flush(pagina());
    await refrescar();

    expect(campo<HTMLInputElement>('input[formcontrolname="ciudad"]').value).toBe('Bogotá');
    expect(elemento().querySelectorAll('.servicio.marcado').length).toBe(2);
    expect(campo<HTMLAnchorElement>('a.tarjeta').getAttribute('href')).toBe(
      '/publicaciones/p-1?llegada=2026-12-04&salida=2026-12-06&huespedes=2',
    );
  });

  it('criterio 3: buscar lleva los filtros a la URL y vuelve a consultar', async () => {
    await abrir();
    esperarBusqueda().flush(pagina());
    await refrescar();

    escribir('input[formcontrolname="ciudad"]', '  Medellín ');
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
    esperarBusqueda().flush(pagina());
    await refrescar();

    escribir('input[formcontrolname="llegada"]', '2026-12-10');
    escribir('input[formcontrolname="salida"]', '2026-12-08');
    escribir('input[formcontrolname="precioMinimo"]', '500000');
    escribir('input[formcontrolname="precioMaximo"]', '100000');
    boton('Buscar').click();
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
    expect(esperarBusqueda().request.params.has('ciudad')).toBe(false);
    expect(campo<HTMLInputElement>('input[formcontrolname="ciudad"]').value).toBe('');
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

  it('muestra el error y permite reintentar', async () => {
    await abrir();
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
    esperarBusqueda().flush(pagina());
    await refrescar();

    escribir('input[formcontrolname="precioMinimo"]', '0');
    escribir('input[formcontrolname="precioMaximo"]', '0');
    boton('Buscar').click();
    await refrescar();

    expect(TestBed.inject(Router).url).toBe('/publicaciones?min=0&max=0');
    const params = esperarBusqueda().request.params;
    expect(params.get('precioMinimo')).toBe('0');
    expect(params.get('precioMaximo')).toBe('0');
    expect(params.has('ciudad')).toBe(false);
  });

  it('limpiar borra lo escrito aunque aún no se haya buscado', async () => {
    await abrir();
    esperarBusqueda().flush(pagina());
    await refrescar();

    escribir('input[formcontrolname="ciudad"]', 'Cali');
    campo<HTMLInputElement>('.servicio input').click();
    boton('Limpiar filtros').click();
    await refrescar();

    expect(campo<HTMLInputElement>('input[formcontrolname="ciudad"]').value).toBe('');
    expect(elemento().querySelectorAll('.servicio.marcado').length).toBe(0);
    expect(TestBed.inject(Router).url).toBe('/publicaciones');
  });

  it('permite reintentar la carga de los servicios sin afectar la búsqueda', async () => {
    await abrir('/publicaciones', true);
    esperarBusqueda().flush(pagina());
    await refrescar();

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
});
