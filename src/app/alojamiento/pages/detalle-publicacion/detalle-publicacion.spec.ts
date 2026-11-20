import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DetallePublicacion } from './detalle-publicacion';
import { simularUrlsDeObjeto } from '../../../shared/utils/url-objeto.testing';

describe('DetallePublicacion (HU-011)', () => {
  let restaurarUrls: () => void = () => undefined;
  let fixture: ComponentFixture<DetallePublicacion>;
  let backend: HttpTestingController;
  const api = environment.apiUrl;
  const url = `${api}/publicaciones/mis-publicaciones/p-1`;

  const detalle = (cambios: object = {}) => ({
    idPublicacion: 'p-1',
    idAlojamiento: 'a-1',
    idPolitica: 'pol-1',
    titulo: 'Cabaña frente al lago',
    descripcion: 'Vista al embalse.',
    reglas: 'No fumar',
    precioPorNoche: 250000,
    tarifaLimpieza: 30000,
    modoAceptacion: 'APROBACION',
    estado: 'PENDIENTE_REVISION',
    fechaCreacion: '2026-11-18T10:00:00-05:00',
    fechaActualizacion: null,
    ubicacion: 'Vereda El Lago',
    ciudad: 'Guatavita',
    tipoAlojamiento: 'Cabaña',
    capacidad: 4,
    habitaciones: 2,
    camas: 1,
    banos: 1,
    servicios: [{ idServicio: 's-1', nombre: 'Wifi', descripcion: null }],
    imagenes: [
      { idImagen: 'i-2', rutaImagen: '/imagenes/publicaciones/b.jpg', orden: 2, esPortada: false },
      { idImagen: 'i-1', rutaImagen: '/imagenes/publicaciones/a.jpg', orden: 1, esPortada: true },
    ],
    ...cambios,
  });

  const crear = (aviso?: string) => {
    restaurarUrls = simularUrlsDeObjeto(() => 'blob:x', vi.fn());
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ idPublicacion: 'p-1' })),
            queryParamMap: of(convertToParamMap(aviso ? { aviso } : {})),
          },
        },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetallePublicacion);
    fixture.detectChanges();
    TestBed.tick();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;

  const RESPUESTAS_SECCIONES: Record<string, object> = {
    '/modo-aceptacion': { idPublicacion: 'p-1', modoAceptacion: 'APROBACION' },
    '/configuracion-comercial': {
      idPublicacion: 'p-1',
      tarifaLimpieza: 30000,
      serviciosAdicionales: [
        { idAdicional: 'a-1', nombre: 'Desayuno', descripcion: null, costo: 20000, activo: true },
      ],
      fechaActualizacion: null,
    },
    '/politica-cancelacion': {
      idPublicacion: 'p-1',
      idPolitica: 'pol-1',
      nombre: 'Flexible',
      version: 1,
      descripcion: null,
      anticipacionHoras: 24,
      porcentajeDevolucion: 100,
      activa: true,
    },
  };

  const responderSecciones = async () => {
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
    TestBed.tick();
    for (const pendiente of backend.match((peticion) => peticion.url !== url)) {
      const seccion = Object.keys(RESPUESTAS_SECCIONES).find((ruta) =>
        pendiente.request.url.endsWith(ruta),
      );
      pendiente.flush(seccion ? RESPUESTAS_SECCIONES[seccion] : new Blob(['x']));
    }
    await fixture.whenStable();
  };

  afterEach(() => {
    backend.verify();
    restaurarUrls();
  });

  it('criterio 2: muestra el detalle de la publicación propia', async () => {
    crear();
    backend.expectOne(url).flush(detalle());
    await responderSecciones();

    const texto = elemento().textContent ?? '';
    expect(elemento().querySelector('h1')?.textContent).toBe('Cabaña frente al lago');
    expect(elemento().querySelector('.estado')?.textContent?.trim()).toBe('En revisión');
    expect(elemento().querySelector('.subtitulo .tipo')?.textContent?.trim()).toBe('Cabaña');
    expect(elemento().querySelector('.subtitulo .lugar')?.textContent?.trim()).toBe(
      'Vereda El Lago, Guatavita',
    );
    expect(texto).toContain('Vista al embalse.');
    expect(texto).toContain('No fumar');
    expect(texto).toContain('Wifi');
    expect(texto).toContain('250.000');
    expect(texto).toContain('30.000');
    expect(texto).toContain('4 huéspedes');
    expect(
      [...elemento().querySelectorAll('.datos .espacio')].map((linea) => linea.textContent?.trim()),
    ).toEqual(['2 habitaciones', '1 cama', '1 baño']);
    expect(texto).toContain('Con mi aprobación');
    expect(texto).not.toContain('Última actualización');
  });

  it('permite editar la publicación desde el detalle', async () => {
    crear();
    backend.expectOne(url).flush(detalle({ imagenes: [], estado: 'BORRADOR' }));
    await responderSecciones();

    expect(elemento().querySelector('a.editar')?.getAttribute('href')).toBe(
      '/alojamientos/p-1/editar',
    );
    expect(elemento().querySelector('.aviso')).toBeNull();
  });

  it('actualiza el estado mostrado cuando se envía a revisión', async () => {
    crear();
    backend.expectOne(url).flush(detalle({ imagenes: [], estado: 'BORRADOR' }));
    await responderSecciones();

    elemento().querySelector<HTMLButtonElement>('app-acciones-estado button')?.click();
    backend.expectOne(`${api}/publicaciones/p-1/enviar-revision`).flush({
      idPublicacion: 'p-1',
      estadoAnterior: 'BORRADOR',
      estadoActual: 'PENDIENTE_REVISION',
    });
    await fixture.whenStable();

    expect(elemento().querySelector('.cabecera .estado')?.textContent?.trim()).toBe('En revisión');
    expect(elemento().querySelector('app-acciones-estado')?.textContent).toContain(
      'Un administrador está revisando',
    );
  });

  it('muestra el propietario del inmueble solo si el anfitrión lo indicó', async () => {
    crear();
    backend.expectOne(url).flush(detalle({ imagenes: [], propietarioInmueble: 'Ana Gómez' }));
    await responderSecciones();

    const fila = [...elemento().querySelectorAll('.datos div')].find(
      (item) => item.querySelector('dt')?.textContent?.trim() === 'Propietario del inmueble',
    );
    expect(fila?.querySelector('dd')?.textContent?.trim()).toBe('Ana Gómez');
  });

  it('muestra las condiciones de reserva de la publicación', async () => {
    crear();
    backend.expectOne(url).flush(detalle({ imagenes: [] }));
    await responderSecciones();

    const condiciones = elemento().querySelector('.condiciones');
    expect(condiciones?.querySelector('h2')?.textContent).toBe('Condiciones de reserva');
    expect(condiciones?.querySelector('a')?.getAttribute('href')).toBe('/disponibilidad/p-1');
    expect(condiciones?.querySelector('app-politica-publicacion')?.textContent).toContain(
      'Flexible',
    );
    expect(condiciones?.querySelector('app-tarifas-publicacion')?.textContent).toContain(
      'Desayuno',
    );
    expect(condiciones?.querySelector('app-modo-aceptacion-publicacion')?.textContent).toContain(
      'Con mi aprobación',
    );
  });

  it('no permite editar ni cambiar las condiciones si está bloqueada o en revisión', async () => {
    for (const estado of ['BLOQUEADA', 'PENDIENTE_REVISION']) {
      restaurarUrls();
      TestBed.resetTestingModule();
      crear();
      backend.expectOne(url).flush(detalle({ imagenes: [], estado }));
      await responderSecciones();

      expect(elemento().querySelector('.condiciones button')).toBeNull();
      expect(elemento().querySelector('.cabecera a.editar')).toBeNull();
      expect(elemento().querySelector('.titulo-seccion a.editar')).not.toBeNull();
      backend.verify();
    }
  });

  it('actualiza la tarifa y el modo mostrados al instante, sin volver a consultar', async () => {
    crear();
    backend.expectOne(url).flush(detalle({ imagenes: [], estado: 'ACTIVA' }));
    await responderSecciones();
    const tarjeta = (selector: string) => elemento().querySelector(selector) as HTMLElement;
    const boton = (raiz: HTMLElement, texto: string) =>
      [...raiz.querySelectorAll<HTMLButtonElement>('button')].find(
        (candidato) => candidato.textContent?.trim() === texto,
      );

    const modo = tarjeta('app-modo-aceptacion-publicacion');
    boton(modo, 'Cambiar')?.click();
    await fixture.whenStable();
    modo.querySelectorAll<HTMLInputElement>('input[type="radio"]')[0].click();
    boton(modo, 'Guardar')?.click();
    backend.expectOne(`${api}/publicaciones/p-1/modo-aceptacion`).flush({
      idPublicacion: 'p-1',
      modoAceptacion: 'INMEDIATA',
      fechaActualizacion: '2026-11-19T09:00:00-05:00',
    });
    await fixture.whenStable();

    backend.expectNone(url);
    const datos = () => elemento().querySelector('.datos')?.textContent ?? '';
    expect(datos()).toContain('Reserva inmediata');
    expect(datos()).toContain('Última actualización');
    expect(datos()).toContain('19 de nov');

    fixture.componentInstance.alGuardarTarifas({
      idPublicacion: 'p-1',
      tarifaLimpieza: 45000,
      serviciosAdicionales: [],
      fechaActualizacion: '2026-11-20T09:00:00-05:00',
    });
    await fixture.whenStable();
    expect(datos()).toContain('45.000');
    expect(datos()).toContain('20 de nov');
    fixture.componentInstance.alGuardarModo({
      idPublicacion: 'p-1',
      modoAceptacion: 'APROBACION',
      fechaActualizacion: null,
    });
    await fixture.whenStable();
    expect(datos()).toContain('20 de nov');
    backend.expectNone(url);
  });

  it('confirma que se guardaron los cambios al volver de editar', async () => {
    crear('actualizada');
    backend.expectOne(url).flush(detalle({ imagenes: [] }));
    await responderSecciones();

    expect(elemento().querySelector('.aviso[role="status"]')?.textContent).toContain(
      'Guardamos los cambios',
    );
  });

  it('pone la portada de primera en la galería', async () => {
    crear();
    backend.expectOne(url).flush(detalle());
    await responderSecciones();

    const imagenes = elemento().querySelectorAll<HTMLImageElement>('.galeria img');
    expect(imagenes).toHaveLength(2);
    expect(imagenes[0].alt).toBe('Imagen 1 de Cabaña frente al lago');
    expect(elemento().querySelector('.galeria li')?.classList).toContain('portada');
  });

  it('omite las reglas y avisa si no hay servicios', async () => {
    crear();
    backend.expectOne(url).flush(
      detalle({
        reglas: null,
        servicios: [],
        imagenes: [],
        fechaActualizacion: '2026-11-19T10:00:00Z',
      }),
    );
    await responderSecciones();

    const texto = elemento().textContent ?? '';
    expect(texto).not.toContain('Reglas de la casa');
    expect(texto).toContain('Sin servicios registrados.');
    expect(texto).toContain('Última actualización');
    expect(elemento().querySelector('.galeria')).toBeNull();
  });

  it('criterio 4: no muestra publicaciones ajenas o inexistentes', async () => {
    crear();
    backend
      .expectOne(url)
      .flush(
        { mensaje: 'La publicación no existe o no pertenece a tu cuenta.' },
        { status: 404, statusText: 'Not Found' },
      );
    await fixture.whenStable();

    expect(elemento().querySelector('h1')?.textContent).toBe('No encontramos esta publicación');
    expect(elemento().querySelector('.volver')?.getAttribute('href')).toBe('/alojamientos');
  });

  it('ante otro error permite reintentar', async () => {
    crear();
    backend.expectOne(url).flush('Error', { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(elemento().querySelector('.alerta')?.textContent).toContain('Error');
    elemento().querySelector<HTMLButtonElement>('.alerta button')?.click();
    fixture.detectChanges();
    TestBed.tick();

    backend.expectOne(url).flush(detalle({ imagenes: [] }));
    await responderSecciones();
    expect(elemento().querySelector('h1')?.textContent).toBe('Cabaña frente al lago');
  });
});
