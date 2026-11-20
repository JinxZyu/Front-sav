import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { publicacionPublica } from '../../models/catalogo.testing';
import { DetallePublico } from './detalle-publico';

describe('DetallePublico (HU-025)', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/publicaciones/p-1/detalle-publico`;
  const resenas = `${environment.apiUrl}/publicaciones/p-1/resenas`;

  const abrir = async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'publicaciones/:idPublicacion', component: DetallePublico },
          { path: '**', children: [] },
        ]),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create('/publicaciones/p-1');
  };

  const responder = async (cuerpo: object, opciones?: { status: number; statusText: string }) => {
    backend.expectOne(url).flush(cuerpo, opciones);
    await new Promise((resolver) => setTimeout(resolver));
    harness.detectChanges();
    await new Promise((resolver) => setTimeout(resolver));
    for (const peticion of backend.match(resenas)) {
      peticion.flush({
        idPublicacion: 'p-1',
        resenas: [],
        totalResenas: 0,
        calificacionPromedio: 0,
        mensaje: null,
      });
    }
    for (const peticion of backend.match((solicitud) =>
      solicitud.url.endsWith('/disponibilidad'),
    )) {
      peticion.flush({ nochesOcupadas: [], periodosDisponibles: [] });
    }
    await new Promise((resolver) => setTimeout(resolver));
    harness.detectChanges();
  };

  const elemento = () => harness.routeNativeElement as HTMLElement;

  afterEach(() => backend.verify());

  it('muestra un estado de carga mientras consulta', async () => {
    await abrir();
    expect(elemento().querySelector('[aria-busy="true"]')).not.toBeNull();
    await responder(publicacionPublica());
  });

  it('criterio 1: muestra fotos, espacios, servicios, reglas y política', async () => {
    await abrir();
    await responder(publicacionPublica());

    const texto = elemento().textContent ?? '';
    expect(elemento().querySelector('h1')?.textContent).toContain('Loft en Chapinero');
    expect(texto).toContain('Apartamento en Bogotá');
    expect(texto).toContain('Hasta 4 huéspedes');
    expect(texto).toContain('2 habitaciones');
    expect(texto).toContain('Wifi');
    expect(texto).toContain('No fumar.');
    expect(texto).toContain('Flexible.');
    expect(texto).toContain('Devolución del 100 %');
    expect(texto).toContain('24 horas');
    expect(texto).toContain('Desayuno');
    expect(elemento().querySelector('app-resenas-publicacion')?.textContent).toContain(
      'Este alojamiento aún no tiene reseñas.',
    );
    expect(elemento().querySelector('.lugar')?.textContent).toContain('Calle 60 # 5-10, Bogotá');
    const fotos = [...elemento().querySelectorAll<HTMLImageElement>('.galeria img')];
    expect(fotos.map((foto) => foto.getAttribute('src'))).toEqual([
      'https://img.test/1.jpg',
      'https://img.test/2.jpg',
    ]);
    expect(elemento().querySelector('.galeria')?.getAttribute('data-cantidad')).toBe('2');
  });

  it('criterio 2: explica cuando el anfitrión aprueba cada solicitud', async () => {
    await abrir();
    await responder(publicacionPublica({ politica: null }, { modoAceptacion: 'APROBACION' }));

    const texto = elemento().textContent ?? '';
    expect(texto).toContain('El anfitrión revisa cada solicitud');
    expect(texto).toContain('aún no definió una política');
  });

  it('criterio 3: informa cuando la publicación no está disponible', async () => {
    await abrir();
    await responder(
      { mensaje: 'La publicación no existe o no está disponible.' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(elemento().querySelector('[role="alert"] h1')?.textContent).toContain(
      'Este alojamiento no existe o no está disponible',
    );
  });

  it('permite reintentar cuando falla la consulta', async () => {
    await abrir();
    await responder({}, { status: 500, statusText: 'Error' });
    elemento().querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    TestBed.tick();
    await responder(publicacionPublica());

    expect(elemento().querySelector('h1')?.textContent).toContain('Loft en Chapinero');
  });
});
