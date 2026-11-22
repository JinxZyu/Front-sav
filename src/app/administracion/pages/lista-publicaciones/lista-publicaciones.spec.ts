import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { publicacionAdministrada } from '../../models/publicacion-administrada.testing';
import { ListaPublicaciones } from './lista-publicaciones';

describe('ListaPublicaciones (HU-014)', () => {
  let fixture: ComponentFixture<ListaPublicaciones>;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/administracion/publicaciones`;

  const publicaciones = [
    publicacionAdministrada({
      idPublicacion: 'p-3',
      titulo: 'Casa en Guatapé',
      estado: 'ACTIVA',
      fechaCreacion: '2026-11-15T15:00:00Z',
    }),
    publicacionAdministrada({
      idPublicacion: 'p-2',
      titulo: 'Cabaña frente al embalse',
      fechaActualizacion: '2026-11-14T15:00:00Z',
    }),
    publicacionAdministrada({ idPublicacion: 'p-1', titulo: 'Loft en Chapinero' }),
    publicacionAdministrada({
      idPublicacion: 'p-4',
      titulo: 'Apartamento sin enviar',
      estado: 'BORRADOR',
      fechaActualizacion: null,
    }),
    publicacionAdministrada({
      idPublicacion: 'p-5',
      titulo: 'Finca engañosa',
      estado: 'BLOQUEADA',
    }),
  ];

  const crear = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ListaPublicaciones);
    fixture.detectChanges();
    TestBed.tick();
  };

  const listar = async (lista = publicaciones) => {
    backend.expectOne(api).flush(lista);
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const titulos = () =>
    [...elemento().querySelectorAll('a.publicacion .titulo')].map((item) =>
      item.textContent?.trim(),
    );
  const boton = (texto: string) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('button')].find((item) =>
      item.textContent?.trim().startsWith(texto),
    ) as HTMLButtonElement;
  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => backend.verify());

  it('muestra un esqueleto mientras consulta', async () => {
    crear();
    expect(elemento().querySelector('[aria-busy="true"]')).not.toBeNull();
    await listar([]);
  });

  it('empieza por las publicaciones en revisión, de la más antigua a la más reciente', async () => {
    crear();
    await listar();

    expect(boton('Por revisar').getAttribute('aria-pressed')).toBe('true');
    expect(boton('Por revisar').textContent).toContain('(2)');
    expect(boton('Todas').textContent).toContain('(4)');
    expect(titulos()).toEqual(['Loft en Chapinero', 'Cabaña frente al embalse']);
    const primera = elemento().querySelector('a.publicacion') as HTMLAnchorElement;
    expect(primera.getAttribute('href')).toBe('/p-1');
    expect(primera.textContent).toContain('En revisión');
    expect(primera.textContent).toContain('Enviada a revisión el 12 de nov de 2026');
  });

  it('muestra las publicaciones de a 10 por página y vuelve a la primera al cambiar de filtro', async () => {
    const muchas = Array.from({ length: 23 }, (_, indice) =>
      publicacionAdministrada({
        idPublicacion: `p-${indice}`,
        titulo: `Publicación ${String(indice).padStart(2, '0')}`,
        estado: 'PENDIENTE_REVISION',
        fechaActualizacion: `2026-11-${String(indice + 1).padStart(2, '0')}T10:00:00Z`,
      }),
    );
    const paginacion = () =>
      elemento().querySelector('nav.paginacion')?.textContent?.replace(/\s+/g, ' ').trim();
    const siguiente = () =>
      [...elemento().querySelectorAll<HTMLButtonElement>('nav.paginacion button')].find(
        (item) => item.textContent?.trim() === 'Siguiente',
      ) as HTMLButtonElement;
    crear();
    await listar(muchas);

    expect(titulos()).toHaveLength(10);
    expect(titulos()[0]).toBe('Publicación 00');
    expect(paginacion()).toBe('AnteriorPágina 1 de 3 Siguiente');

    siguiente().click();
    await actualizar();
    expect(titulos()[0]).toBe('Publicación 10');

    siguiente().click();
    await actualizar();
    expect(titulos()).toHaveLength(3);

    boton('Todas').click();
    await actualizar();
    expect(titulos()[0]).toContain('Publicación');
    expect(paginacion()).toContain('Página 1 de 3');
  });

  it('muestra todas las publicaciones con su estado salvo los borradores del anfitrión', async () => {
    crear();
    await listar();

    boton('Todas').click();
    await actualizar();

    expect(titulos()).toEqual([
      'Casa en Guatapé',
      'Cabaña frente al embalse',
      'Loft en Chapinero',
      'Finca engañosa',
    ]);
    expect(elemento().textContent).not.toContain('Apartamento sin enviar');
    const enlaces = [...elemento().querySelectorAll('a.publicacion')];
    expect(enlaces[0].textContent).toContain('Publicada');
    expect(enlaces[0].textContent).toContain('Creada el 15 de nov de 2026');
    expect(enlaces[3].textContent).toContain('Bloqueada');
  });

  it('HU-017: filtra las publicaciones bloqueadas', async () => {
    crear();
    await listar();
    expect(boton('Bloqueadas').textContent).toContain('(1)');

    boton('Bloqueadas').click();
    await actualizar();

    expect(boton('Bloqueadas').getAttribute('aria-pressed')).toBe('true');
    expect(titulos()).toEqual(['Finca engañosa']);
    expect(elemento().querySelector('a.publicacion')?.textContent).toContain('Bloqueada');
  });

  it('HU-017: avisa cuando no hay publicaciones bloqueadas', async () => {
    crear();
    await listar([publicaciones[0]]);
    boton('Bloqueadas').click();
    await actualizar();
    expect(elemento().textContent).toContain('No hay publicaciones bloqueadas');
  });

  it('busca por título sin importar tildes', async () => {
    crear();
    await listar();
    boton('Todas').click();
    await actualizar();
    const buscador = elemento().querySelector('input[type="search"]') as HTMLInputElement;

    buscador.value = 'cabana';
    buscador.dispatchEvent(new Event('input'));
    await actualizar();
    expect(titulos()).toEqual(['Cabaña frente al embalse']);

    buscador.value = 'nada';
    buscador.dispatchEvent(new Event('input'));
    await actualizar();
    expect(elemento().textContent).toContain('No hay publicaciones con ese título');
  });

  it('avisa cuando no hay publicaciones por revisar', async () => {
    crear();
    await listar([publicaciones[0]]);
    expect(elemento().textContent).toContain('No hay publicaciones por revisar');

    boton('Todas').click();
    await actualizar();
    expect(titulos()).toEqual(['Casa en Guatapé']);
  });

  it('avisa cuando aún no hay publicaciones', async () => {
    crear();
    await listar([]);
    boton('Todas').click();
    await actualizar();
    expect(elemento().textContent).toContain('Aún no hay publicaciones');
  });

  it('si falla la consulta permite reintentar', async () => {
    crear();
    backend.expectOne(api).flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos consultar las publicaciones.',
    );
    boton('Reintentar').click();
    fixture.detectChanges();
    await listar();
    expect(titulos()).toHaveLength(2);
  });
});
