import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { AvisosService } from '../../../shared/services/avisos.service';
import { publicacionParaRevisar } from '../../models/publicacion-administrada.testing';
import { RevisionPublicacion } from './revision-publicacion';

describe('RevisionPublicacion (HU-014)', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/administracion/publicaciones`;

  const abrir = async (idPublicacion = 'p-1') => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'administracion/publicaciones/:idPublicacion', component: RevisionPublicacion },
        ]),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/administracion/publicaciones/${idPublicacion}`);
  };

  const responder = async (cuerpo: object, opciones?: { status: number; statusText: string }) => {
    backend.expectOne(`${api}/p-1`).flush(cuerpo, opciones);
    await new Promise((resolver) => setTimeout(resolver));
    harness.detectChanges();
    TestBed.tick();
  };

  const elemento = () => harness.routeNativeElement as HTMLElement;
  const decision = () =>
    elemento().querySelector('section[aria-labelledby="titulo-decision"]') as HTMLElement;
  const boton = (contenedor: HTMLElement, texto: string) =>
    [...contenedor.querySelectorAll<HTMLButtonElement>('button')].find((item) =>
      item.textContent?.trim().startsWith(texto),
    ) as HTMLButtonElement;
  const refrescar = () => {
    harness.detectChanges();
    TestBed.tick();
  };

  afterEach(() => backend.verify());

  it('muestra un esqueleto mientras consulta', async () => {
    await abrir();
    expect(elemento().querySelector('[aria-busy="true"]')).not.toBeNull();
    await responder(publicacionParaRevisar());
  });

  it('muestra todo lo que el anfitrión registró para poder revisarlo', async () => {
    await abrir();
    await responder(publicacionParaRevisar());

    const texto = elemento().textContent ?? '';
    expect(elemento().querySelector('h1')?.textContent?.trim()).toBe('Loft en Chapinero');
    expect(texto).toContain('En revisión');
    expect(texto).toContain('Apartamento en Bogotá');
    expect(texto).toContain('Calle 60 # 5-10');
    expect(texto).toContain('Hasta 4 huéspedes');
    expect(texto).toContain('2 habitaciones');
    expect(texto).toContain('Loft con vista a los cerros.');
    expect(texto).toContain('Wifi');
    expect(texto).toContain('Desayuno');
    expect(texto).toContain('No fumar.');
    expect(texto).toContain('180.000');
    expect(texto).toContain('30.000');
    expect(texto).toContain('Flexible');
    expect(texto).toContain('100 %');
    expect(texto).toContain('El anfitrión aprueba cada solicitud');
    expect(elemento().querySelectorAll('.galeria app-imagen-publicacion')).toHaveLength(1);
    expect(elemento().querySelector('a.volver')?.getAttribute('href')).toBe(
      '/administracion/publicaciones',
    );
  });

  it('indica cuando no hay fotos, reglas, servicios, tarifa ni política', async () => {
    const datos = publicacionParaRevisar();
    await abrir();
    await responder({
      ...datos,
      publicacion: {
        ...datos.publicacion,
        imagenes: [],
        reglas: null,
        servicios: [],
        tarifaLimpieza: null,
        capacidad: 1,
        modoAceptacion: 'OTRO',
      },
      serviciosAdicionales: [],
      politica: null,
    });

    const texto = elemento().textContent ?? '';
    expect(texto).toContain('El anfitrión no subió fotos.');
    expect(texto).toContain('No registró reglas.');
    expect(texto).toContain('No registró servicios incluidos.');
    expect(texto).toContain('Sin tarifa');
    expect(texto).toContain('Sin política');
    expect(texto).toContain('Hasta 1 huésped');
    expect(texto).toContain('OTRO');
    expect(texto).not.toContain('Servicios adicionales');
  });

  it('criterio 1: aprueba la publicación y muestra su nuevo estado', async () => {
    await abrir();
    await responder(publicacionParaRevisar());
    const mostrar = vi.spyOn(TestBed.inject(AvisosService), 'mostrar');

    boton(decision(), 'Aprobar y publicar').click();
    refrescar();

    expect(boton(decision(), 'Aprobando').disabled).toBe(true);
    const peticion = backend.expectOne(`${api}/p-1/aprobar`);
    expect(peticion.request.method).toBe('PATCH');
    peticion.flush({ estadoActual: 'ACTIVA', mensaje: 'La publicación ha sido aprobada.' });
    refrescar();

    expect(mostrar).toHaveBeenCalledWith(
      'Publicación aprobada',
      'La publicación ha sido aprobada.',
    );
    await responder(publicacionParaRevisar('ACTIVA'));
    expect(elemento().textContent).toContain('Publicada');
    expect(decision()).toBeNull();
  });

  it('criterio 2: rechaza la publicación con su motivo', async () => {
    await abrir();
    await responder(publicacionParaRevisar());
    const mostrar = vi.spyOn(TestBed.inject(AvisosService), 'mostrar');

    boton(decision(), 'Rechazar').click();
    refrescar();
    const campo = decision().querySelector('textarea') as HTMLTextAreaElement;
    expect(decision().querySelector('label')?.textContent).toContain('Motivo del rechazo');
    campo.value = 'Las fotos no corresponden al alojamiento';
    campo.dispatchEvent(new Event('input'));
    decision().querySelector('form')?.dispatchEvent(new Event('submit'));
    refrescar();

    const peticion = backend.expectOne(`${api}/p-1/rechazar`);
    expect(peticion.request.body).toEqual({ motivo: 'Las fotos no corresponden al alojamiento' });
    peticion.flush({ estadoActual: 'BORRADOR', mensaje: 'La publicación ha sido rechazada.' });
    refrescar();

    expect(mostrar).toHaveBeenCalledWith(
      'Publicación rechazada',
      'La publicación ha sido rechazada.',
    );
    await responder(publicacionParaRevisar('BORRADOR'));
    expect(elemento().textContent).toContain('Borrador');
    expect(decision()).toBeNull();
  });

  it('cancelar el rechazo vuelve a mostrar las opciones', async () => {
    await abrir();
    await responder(publicacionParaRevisar());

    boton(decision(), 'Rechazar').click();
    refrescar();
    boton(decision(), 'Cancelar').click();
    refrescar();

    expect(decision().querySelector('form')).toBeNull();
    expect(boton(decision(), 'Aprobar y publicar')).toBeDefined();
  });

  it('fuera de revisión no ofrece aprobar ni rechazar', async () => {
    await abrir();
    await responder(publicacionParaRevisar('PAUSADA'));

    expect(decision()).toBeNull();
    expect(elemento().textContent).not.toContain('Aprobar y publicar');
    expect(elemento().textContent).toContain('no está en revisión');
  });

  it('criterio 5: informa por qué no se pudo aprobar', async () => {
    await abrir();
    await responder(publicacionParaRevisar());

    boton(decision(), 'Aprobar y publicar').click();
    refrescar();
    backend
      .expectOne(`${api}/p-1/aprobar`)
      .flush(
        { mensaje: 'La cuenta del anfitrión está restringida.' },
        { status: 409, statusText: 'Conflict' },
      );
    refrescar();

    expect(decision().querySelector('[role="alert"]')?.textContent).toContain(
      'La cuenta del anfitrión está restringida.',
    );
    expect(boton(decision(), 'Aprobar y publicar').disabled).toBe(false);
  });

  it('muestra el error del rechazo dentro del formulario', async () => {
    await abrir();
    await responder(publicacionParaRevisar());

    boton(decision(), 'Rechazar').click();
    refrescar();
    const campo = decision().querySelector('textarea') as HTMLTextAreaElement;
    campo.value = 'Datos incompletos';
    campo.dispatchEvent(new Event('input'));
    decision().querySelector('form')?.dispatchEvent(new Event('submit'));
    refrescar();
    backend
      .expectOne(`${api}/p-1/rechazar`)
      .flush(
        { mensaje: 'Solamente puedes rechazar publicaciones en revisión.' },
        { status: 409, statusText: 'Conflict' },
      );
    refrescar();

    expect(decision().querySelector('form [role="alert"]')?.textContent).toContain(
      'Solamente puedes rechazar publicaciones en revisión.',
    );
  });

  it('avisa si la publicación no existe', async () => {
    await abrir();
    await responder(
      { mensaje: 'La publicación no existe.' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(elemento().querySelector('h1')?.textContent).toContain('Esta publicación no existe');
  });

  it('si falla la consulta permite reintentar', async () => {
    await abrir();
    await responder({}, { status: 500, statusText: 'Error' });

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos cargar la publicación.',
    );
    boton(elemento(), 'Reintentar').click();
    refrescar();
    await responder(publicacionParaRevisar());
    expect(elemento().querySelector('h1')?.textContent?.trim()).toBe('Loft en Chapinero');
  });
});
