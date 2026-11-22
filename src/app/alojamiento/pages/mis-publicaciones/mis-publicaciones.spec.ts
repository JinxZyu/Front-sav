import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { simularUrlsDeObjeto } from '../../../shared/utils/url-objeto.testing';
import { MisPublicaciones } from './mis-publicaciones';

describe('MisPublicaciones (HU-011)', () => {
  let fixture: ComponentFixture<MisPublicaciones>;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/publicaciones/mis-publicaciones`;

  const publicacion = (cambios: object = {}) => ({
    idPublicacion: 'p-1',
    idAlojamiento: 'a-1',
    titulo: 'Cabaña frente al lago',
    ciudad: 'Guatavita',
    tipoAlojamiento: 'Cabaña',
    capacidad: 4,
    precioPorNoche: 250000,
    estado: 'BORRADOR',
    fechaCreacion: '2026-11-18T10:00:00-05:00',
    ...cambios,
  });

  const crear = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MisPublicaciones);
    fixture.detectChanges();
    TestBed.tick();
  };

  const responder = async (cuerpo: object) => {
    backend.expectOne(url).flush(cuerpo);
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const tarjetas = () => elemento().querySelectorAll<HTMLAnchorElement>('a.tarjeta');

  afterEach(() => backend.verify());

  it('muestra un esqueleto mientras consulta', () => {
    crear();
    expect(elemento().querySelector('[aria-busy="true"]')).not.toBeNull();
    backend.expectOne(url).flush({ mensaje: '', publicaciones: [] });
  });

  it('criterio 1: lista las publicaciones del anfitrión con su estado', async () => {
    crear();
    await responder({
      mensaje: 'Publicaciones consultadas correctamente.',
      publicaciones: [
        publicacion(),
        publicacion({
          idPublicacion: 'p-2',
          titulo: 'Apartamento centro',
          estado: 'ACTIVA',
          capacidad: 1,
        }),
      ],
    });

    expect(tarjetas()).toHaveLength(2);
    expect(tarjetas()[0].textContent).toContain('Cabaña frente al lago');
    expect(tarjetas()[0].textContent).toContain('Cabaña en Guatavita');
    expect(tarjetas()[0].textContent).toContain('4 huéspedes');
    expect(tarjetas()[0].textContent).toContain('250.000');
    expect(tarjetas()[0].querySelector('.estado')?.textContent?.trim()).toBe('Borrador');
    expect(tarjetas()[0].querySelector('.estado')?.classList).toContain('borrador');
    expect(tarjetas()[1].querySelector('.estado')?.textContent?.trim()).toBe('Publicada');
    expect(tarjetas()[1].textContent).toContain('1 huésped');
    expect(elemento().querySelector('.conteo')?.textContent).toContain('2');
  });

  it('muestra la portada de cada publicación o un marcador si no tiene', async () => {
    const restaurar = simularUrlsDeObjeto(() => 'blob:portada', vi.fn());
    crear();
    backend.expectOne(url).flush({
      mensaje: '',
      publicaciones: [
        publicacion({ imagenPortada: '/imagenes/publicaciones/portada.jpg' }),
        publicacion({ idPublicacion: 'p-2', imagenPortada: null }),
      ],
    });
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
    TestBed.tick();
    backend
      .expectOne(`${environment.apiUrl}/imagenes/publicaciones/portada.jpg`)
      .flush(new Blob(['x']));
    await fixture.whenStable();

    const [conFoto, sinFoto] = tarjetas();
    expect(conFoto.querySelector('.foto img')?.getAttribute('alt')).toBe(
      'Portada de Cabaña frente al lago',
    );
    expect(sinFoto.querySelector('app-imagen-publicacion')).toBeNull();
    expect(sinFoto.querySelector('.sin-foto')?.textContent?.trim()).toBe('Sin foto');
    restaurar();
  });

  it('criterio 2: cada publicación lleva a su detalle', async () => {
    crear();
    await responder({ mensaje: '', publicaciones: [publicacion()] });

    expect(tarjetas()[0].getAttribute('href')).toBe('/p-1');
  });

  it('criterio 3: informa cuando no hay publicaciones e invita a crear una', async () => {
    crear();
    await responder({ mensaje: 'No tienes publicaciones registradas.', publicaciones: [] });

    expect(tarjetas()).toHaveLength(0);
    expect(elemento().querySelector('.vacio')?.textContent).toContain('Aún no tienes alojamientos');
    expect(elemento().querySelector('.resumen')).toBeNull();
    expect(elemento().querySelector('.vacio a')?.getAttribute('href')).toBe('/nuevo');
  });

  it('ya no muestra los ingresos aquí: tienen su propio apartado', async () => {
    crear();
    await responder({ mensaje: '', publicaciones: [publicacion()] });

    expect(elemento().querySelector('app-resumen-ingresos')).toBeNull();
    expect(elemento().textContent).not.toContain('Lo que has generado');
  });

  it('siempre ofrece publicar un alojamiento nuevo', async () => {
    crear();
    await responder({ mensaje: '', publicaciones: [publicacion()] });

    expect(elemento().querySelector('.cabecera a')?.textContent).toContain('Publicar alojamiento');
  });

  it('muestra el error y permite reintentar', async () => {
    crear();
    backend
      .expectOne(url)
      .flush({ mensaje: 'Servicio no disponible' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'Servicio no disponible',
    );
    elemento().querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    fixture.detectChanges();
    TestBed.tick();

    await responder({ mensaje: '', publicaciones: [publicacion()] });
    expect(elemento().querySelector('[role="alert"]')).toBeNull();
    expect(tarjetas()).toHaveLength(1);
  });

  describe('resumen, búsqueda y filtros', () => {
    const lista = [
      publicacion({ idPublicacion: 'p-1', titulo: 'Cabaña frente al lago', estado: 'ACTIVA' }),
      publicacion({
        idPublicacion: 'p-2',
        titulo: 'Loft en el centro',
        ciudad: 'Bogotá',
        tipoAlojamiento: 'Apartamento',
        estado: 'ACTIVA',
      }),
      publicacion({
        idPublicacion: 'p-3',
        titulo: 'Finca cafetera',
        ciudad: 'Armenia',
        tipoAlojamiento: 'Finca',
        estado: 'BORRADOR',
      }),
      publicacion({
        idPublicacion: 'p-4',
        titulo: 'Casa de playa',
        ciudad: 'Cartagena',
        tipoAlojamiento: 'Casa',
        estado: 'PAUSADA',
      }),
    ];
    const titulos = () =>
      [...elemento().querySelectorAll('a.tarjeta .titulo')].map((nodo) => nodo.textContent?.trim());
    // Las tarjetas del resumen son los filtros: al pulsar una se filtra por ese estado.
    const boton = (texto: string) =>
      [...elemento().querySelectorAll<HTMLButtonElement>('.resumen button')].find(
        (actual) => actual.querySelector('.rotulo')?.textContent?.trim() === texto,
      )!;
    const buscar = async (texto: string) => {
      const campo = elemento().querySelector<HTMLInputElement>('.buscador input')!;
      campo.value = texto;
      campo.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      fixture.detectChanges();
    };

    it('resume cuántas publicaciones hay en total y por estado', async () => {
      crear();
      await responder({ mensaje: '', publicaciones: lista });

      // No hay una segunda fila de filtros repitiendo lo mismo.
      expect(elemento().querySelector('.filtros')).toBeNull();
      const cifras = [...elemento().querySelectorAll('.resumen li')].map(
        (nodo) =>
          `${nodo.querySelector('.cifra')?.textContent} ${nodo.querySelector('.rotulo')?.textContent}`,
      );
      expect(cifras).toEqual([
        '4 Total',
        '2 Publicadas',
        '0 En revisión',
        '1 Pausadas',
        '1 Borrador',
      ]);
    });

    it('filtra por estado y marca el filtro activo', async () => {
      crear();
      await responder({ mensaje: '', publicaciones: lista });

      boton('Publicadas').click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(titulos()).toEqual(['Cabaña frente al lago', 'Loft en el centro']);
      expect(boton('Publicadas').getAttribute('aria-pressed')).toBe('true');
      expect(boton('Total').getAttribute('aria-pressed')).toBe('false');
      expect(elemento().querySelector('.conteo')?.textContent).toContain('Mostrando 2 de 4');
    });

    it('busca por nombre, ciudad o tipo sin importar tildes ni mayúsculas', async () => {
      crear();
      await responder({ mensaje: '', publicaciones: lista });

      await buscar('CABANA');
      expect(titulos()).toEqual(['Cabaña frente al lago']);

      await buscar('bogota');
      expect(titulos()).toEqual(['Loft en el centro']);

      await buscar('apartamento');
      expect(titulos()).toEqual(['Loft en el centro']);
    });

    it('combina la búsqueda con el filtro de estado', async () => {
      crear();
      await responder({ mensaje: '', publicaciones: lista });

      boton('Publicadas').click();
      await buscar('loft');

      expect(titulos()).toEqual(['Loft en el centro']);
    });

    it('si nada coincide lo explica y permite limpiar los filtros', async () => {
      crear();
      await responder({ mensaje: '', publicaciones: lista });

      await buscar('xyz');
      expect(tarjetas()).toHaveLength(0);
      expect(elemento().querySelector('.sin-resultados')?.textContent).toContain(
        'No encontramos alojamientos con ese filtro',
      );

      elemento().querySelector<HTMLButtonElement>('.sin-resultados button')!.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(tarjetas()).toHaveLength(4);
      expect(elemento().querySelector<HTMLInputElement>('.buscador input')!.value).toBe('');
      expect(boton('Total').getAttribute('aria-pressed')).toBe('true');
    });
  });

  it('tolera una respuesta sin lista de publicaciones', async () => {
    crear();
    await responder({ mensaje: 'No tienes publicaciones registradas.' });

    expect(elemento().querySelector('.vacio')).not.toBeNull();
  });
});
