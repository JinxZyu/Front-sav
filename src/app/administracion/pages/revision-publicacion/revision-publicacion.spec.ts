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

  const resenasPublicas = `${environment.apiUrl}/publicaciones/p-1/resenas`;

  const responder = async (cuerpo: object, opciones?: { status: number; statusText: string }) => {
    backend.expectOne(`${api}/p-1`).flush(cuerpo, opciones);
    await new Promise((resolver) => setTimeout(resolver));
    harness.detectChanges();
    TestBed.tick();
    for (const peticion of backend.match(resenasPublicas)) {
      peticion.flush({
        idPublicacion: 'p-1',
        resenas: [],
        totalResenas: 0,
        calificacionPromedio: 0,
        mensaje: null,
      });
    }
    await new Promise((resolver) => setTimeout(resolver));
    harness.detectChanges();
  };

  const elemento = () => harness.routeNativeElement as HTMLElement;
  const decision = () =>
    elemento().querySelector('section[aria-labelledby="titulo-decision"]') as HTMLElement;
  const moderacion = () =>
    elemento().querySelector('section[aria-labelledby="titulo-moderacion"]') as HTMLElement;
  const escribirMotivo = (contenedor: HTMLElement, texto: string) => {
    const campo = contenedor.querySelector('textarea') as HTMLTextAreaElement;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    contenedor.querySelector('form')?.dispatchEvent(new Event('submit'));
    refrescar();
  };
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
    expect(texto).toContain('Inversiones Rojas');
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

  it('HU-017 criterio 1: bloquea la publicación con su motivo', async () => {
    await abrir();
    await responder(publicacionParaRevisar('ACTIVA'));
    const mostrar = vi.spyOn(TestBed.inject(AvisosService), 'mostrar');

    expect(moderacion().textContent).toContain('Las reservas que ya tenga se conservan');
    boton(moderacion(), 'Bloquear publicación').click();
    refrescar();
    expect(moderacion().querySelector('label')?.textContent).toContain('Motivo del bloqueo');
    escribirMotivo(moderacion(), 'Información engañosa sobre la ubicación');

    const peticion = backend.expectOne(`${api}/p-1/bloquear`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({ motivo: 'Información engañosa sobre la ubicación' });
    peticion.flush({ estadoActual: 'BLOQUEADA', mensaje: 'La publicación ha sido bloqueada.' });
    refrescar();

    expect(mostrar).toHaveBeenCalledWith(
      'Publicación bloqueada',
      'La publicación ha sido bloqueada.',
    );
    await responder(publicacionParaRevisar('BLOQUEADA'));
    backend.expectOne(`${api}/p-1/reservas-afectadas`).flush({ mensaje: '', reservas: [] });
    expect(elemento().querySelector('.encabezado')?.textContent).toContain('Bloqueada');
    expect(elemento().querySelector('app-reservas-afectadas')).not.toBeNull();
    expect(moderacion().textContent).toContain('nadie puede reservarla');
    expect(boton(moderacion(), 'Desbloquear')).toBeDefined();
  });

  it('HU-017 criterio 5: desbloquea la publicación con su motivo y queda pausada', async () => {
    await abrir();
    await responder(publicacionParaRevisar('BLOQUEADA'));
    backend.expectOne(`${api}/p-1/reservas-afectadas`).flush({ mensaje: '', reservas: [] });
    const mostrar = vi.spyOn(TestBed.inject(AvisosService), 'mostrar');

    expect(moderacion().textContent).toContain('quedará pausada');
    boton(moderacion(), 'Desbloquear').click();
    refrescar();
    expect(moderacion().querySelector('label')?.textContent).toContain('Motivo del desbloqueo');
    escribirMotivo(moderacion(), 'El anfitrión corrigió la información');

    const peticion = backend.expectOne(`${api}/p-1/desbloquear`);
    expect(peticion.request.body).toEqual({ motivo: 'El anfitrión corrigió la información' });
    peticion.flush({ estadoActual: 'PAUSADA', mensaje: 'La publicación ha sido desbloqueada.' });
    refrescar();

    expect(mostrar).toHaveBeenCalledWith(
      'Publicación desbloqueada',
      'La publicación ha sido desbloqueada.',
    );
    await responder(publicacionParaRevisar('PAUSADA'));
    expect(elemento().querySelector('.encabezado')?.textContent).toContain('Pausada');
    expect(elemento().querySelector('app-reservas-afectadas')).toBeNull();
    expect(boton(moderacion(), 'Bloquear publicación')).toBeDefined();
  });

  it('HU-017: el error del bloqueo se muestra solo en su formulario', async () => {
    await abrir();
    await responder(publicacionParaRevisar());

    boton(moderacion(), 'Bloquear publicación').click();
    refrescar();
    escribirMotivo(moderacion(), 'Fraude');
    backend
      .expectOne(`${api}/p-1/bloquear`)
      .flush(
        { mensaje: 'La publicación ya se encuentra BLOQUEADA.' },
        { status: 409, statusText: 'Conflict' },
      );
    refrescar();

    expect(moderacion().querySelector('form [role="alert"]')?.textContent).toContain(
      'La publicación ya se encuentra BLOQUEADA.',
    );
    expect(decision().querySelector('[role="alert"]')).toBeNull();
  });

  it('HU-017: con el formulario de bloqueo abierto no deja aprobar', async () => {
    await abrir();
    await responder(publicacionParaRevisar());

    boton(moderacion(), 'Bloquear publicación').click();
    refrescar();

    expect(boton(decision(), 'Aprobar y publicar').disabled).toBe(true);
    boton(decision(), 'Aprobar y publicar').click();
    refrescar();
    backend.expectNone(`${api}/p-1/aprobar`);

    boton(moderacion(), 'Cancelar').click();
    refrescar();
    expect(boton(decision(), 'Aprobar y publicar').disabled).toBe(false);
  });

  it('HU-017: el error de la aprobación no aparece en el formulario de bloqueo', async () => {
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

    boton(moderacion(), 'Bloquear publicación').click();
    refrescar();

    expect(moderacion().querySelector('[role="alert"]')).toBeNull();
    expect(decision().querySelector('[role="alert"]')).toBeNull();
  });

  it('HU-017: abrir el bloqueo cierra el formulario de rechazo', async () => {
    await abrir();
    await responder(publicacionParaRevisar());

    boton(decision(), 'Rechazar').click();
    refrescar();
    boton(moderacion(), 'Bloquear publicación').click();
    refrescar();

    expect(decision().querySelector('form')).toBeNull();
    expect(moderacion().querySelector('form')).not.toBeNull();
    boton(moderacion(), 'Cancelar').click();
    refrescar();
    expect(moderacion().querySelector('form')).toBeNull();
  });

  it('HU-042: muestra las reseñas visibles para moderarlas', async () => {
    await abrir();
    await responder(publicacionParaRevisar('ACTIVA'));

    expect(elemento().querySelector('app-moderacion-resenas')?.textContent).toContain(
      'Esta publicación no tiene reseñas visibles.',
    );
  });

  it('al cambiar de publicación descarta el envío pendiente de la anterior', async () => {
    await abrir();
    await responder(publicacionParaRevisar());
    const mostrar = vi.spyOn(TestBed.inject(AvisosService), 'mostrar');

    boton(decision(), 'Rechazar').click();
    refrescar();
    const campo = decision().querySelector('textarea') as HTMLTextAreaElement;
    campo.value = 'Fotos falsas';
    campo.dispatchEvent(new Event('input'));
    decision().querySelector('form')?.dispatchEvent(new Event('submit'));
    refrescar();
    const pendiente = backend.expectOne(`${api}/p-1/rechazar`);

    await harness.navigateByUrl('/administracion/publicaciones/p-2');
    expect(pendiente.cancelled).toBe(true);
    const otra = publicacionParaRevisar();
    backend.expectOne(`${api}/p-2`).flush({
      ...otra,
      publicacion: { ...otra.publicacion, idPublicacion: 'p-2', titulo: 'Cabaña' },
    });
    await new Promise((resolver) => setTimeout(resolver));
    refrescar();
    backend
      .expectOne(`${environment.apiUrl}/publicaciones/p-2/resenas`)
      .flush({
        idPublicacion: 'p-2',
        resenas: [],
        totalResenas: 0,
        calificacionPromedio: 0,
        mensaje: null,
      });
    refrescar();

    expect(mostrar).not.toHaveBeenCalled();
    expect(elemento().querySelector('h1')?.textContent?.trim()).toBe('Cabaña');
    expect(decision().querySelector('form')).toBeNull();
    expect(decision().querySelector('[role="alert"]')).toBeNull();
    expect(boton(decision(), 'Aprobar y publicar').disabled).toBe(false);
  });

  it('muestra los cambios que pide el anfitrión con su mensaje', async () => {
    await abrir();
    await responder({
      ...publicacionParaRevisar(),
      solicitudCambios: {
        mensaje: 'Remodelamos la cocina y subí fotos nuevas.',
        campos: ['Fotos', 'Descripción'],
        estadoAnterior: 'PAUSADA',
        fechaSolicitud: '2026-11-19T15:00:00Z',
      },
    });

    const solicitud = elemento().querySelector('section.solicitud') as HTMLElement;
    expect(solicitud.querySelector('h2')?.textContent).toContain('Cambios que pide el anfitrión');
    expect([...solicitud.querySelectorAll('.campos li')].map((li) => li.textContent?.trim())).toEqual([
      'Fotos',
      'Descripción',
    ]);
    expect(solicitud.querySelector('blockquote')?.textContent).toContain('Remodelamos la cocina');
    expect(solicitud.textContent).toContain('19 de nov');
    expect(solicitud.textContent).toContain('Estaba pausada');
    const decision = elemento().querySelector('section[aria-labelledby="titulo-decision"]') as HTMLElement;
    expect(decision.textContent).toContain('seguirá pausada como la dejó el anfitrión');
    expect(decision.textContent).not.toContain('quedará publicada');
    expect(decision.querySelector('button.principal')?.textContent?.trim()).toBe('Aprobar cambios');
  });

  it('avisa si el anfitrión no indicó el propietario del inmueble', async () => {
    await abrir();
    const datos = publicacionParaRevisar();
    await responder({ ...datos, publicacion: { ...datos.publicacion, propietarioInmueble: null } });
    expect(elemento().textContent).toContain('El anfitrión no indicó el propietario.');
  });

  it('sin solicitud de cambios no muestra esa sección', async () => {
    await abrir();
    await responder(publicacionParaRevisar());
    expect(elemento().querySelector('section.solicitud')).toBeNull();
    const decision = elemento().querySelector('section[aria-labelledby="titulo-decision"]') as HTMLElement;
    expect(decision.textContent).toContain('quedará publicada en el marketplace');
    expect(decision.querySelector('button.principal')?.textContent?.trim()).toBe('Aprobar y publicar');
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
