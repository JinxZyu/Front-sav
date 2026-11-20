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
    servicios: [{ idServicio: 's-1', nombre: 'Wifi', descripcion: null }],
    imagenes: [
      { idImagen: 'i-2', rutaImagen: '/imagenes/publicaciones/b.jpg', orden: 2, esPortada: false },
      { idImagen: 'i-1', rutaImagen: '/imagenes/publicaciones/a.jpg', orden: 1, esPortada: true },
    ],
    ...cambios,
  });

  const crear = () => {
    restaurarUrls = simularUrlsDeObjeto(() => 'blob:x', vi.fn());
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ idPublicacion: 'p-1' })) },
        },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetallePublicacion);
    fixture.detectChanges();
    TestBed.tick();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;

  const responderImagenes = async () => {
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
    TestBed.tick();
    for (const pendiente of backend.match((peticion) => peticion.url.includes('/imagenes/'))) {
      pendiente.flush(new Blob(['x']));
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
    await responderImagenes();

    const texto = elemento().textContent ?? '';
    expect(elemento().querySelector('h1')?.textContent).toBe('Cabaña frente al lago');
    expect(elemento().querySelector('.estado')?.textContent?.trim()).toBe('En revisión');
    expect(texto).toContain('Cabaña · Guatavita · Vereda El Lago');
    expect(texto).toContain('Vista al embalse.');
    expect(texto).toContain('No fumar');
    expect(texto).toContain('Wifi');
    expect(texto).toContain('250.000');
    expect(texto).toContain('30.000');
    expect(texto).toContain('4 huéspedes');
    expect(texto).toContain('Con mi aprobación');
    expect(texto).not.toContain('Última actualización');
  });

  it('pone la portada de primera en la galería', async () => {
    crear();
    backend.expectOne(url).flush(detalle());
    await responderImagenes();

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
    await fixture.whenStable();

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
    await fixture.whenStable();
    expect(elemento().querySelector('h1')?.textContent).toBe('Cabaña frente al lago');
  });
});
