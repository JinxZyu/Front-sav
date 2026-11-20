import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PublicacionAlojamientoService } from './publicacion-alojamiento.service';

describe('PublicacionAlojamientoService', () => {
  const api = environment.apiUrl;
  let servicio: PublicacionAlojamientoService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(PublicacionAlojamientoService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('consulta los servicios y las políticas activas', () => {
    servicio.servicios().subscribe();
    servicio.politicas().subscribe();
    backend.expectOne(`${api}/servicios`).flush([]);
    backend.expectOne(`${api}/politicas-cancelacion/activas`).flush([]);
  });

  it('envía la publicación como formulario con servicios e imágenes repetidos', () => {
    const imagen1 = new File(['a'], 'sala.jpg', { type: 'image/jpeg' });
    const imagen2 = new File(['b'], 'cocina.png', { type: 'image/png' });
    let estado = '';
    servicio
      .crear({
        titulo: 'Cabaña',
        descripcion: 'Junto al lago',
        reglas: 'No fumar',
        ubicacion: 'Vereda El Lago',
        ciudad: 'Guatavita',
        tipoAlojamiento: 'Cabaña',
        capacidad: 4,
        habitaciones: 2,
        camas: 3,
        banos: 2,
        propietarioInmueble: 'Ana Gómez',
        precioPorNoche: 250000,
        tarifaLimpieza: 0,
        modoAceptacion: 'INMEDIATA',
        idPolitica: 'p-1',
        idsServicios: ['s-1', 's-2'],
        imagenes: [imagen1, imagen2],
      })
      .subscribe((respuesta) => (estado = respuesta.estado));

    const peticion = backend.expectOne(`${api}/alojamientos`);
    expect(peticion.request.method).toBe('POST');
    const cuerpo = peticion.request.body as FormData;
    expect(cuerpo.get('titulo')).toBe('Cabaña');
    expect(cuerpo.get('capacidad')).toBe('4');
    expect(cuerpo.get('habitaciones')).toBe('2');
    expect(cuerpo.get('camas')).toBe('3');
    expect(cuerpo.get('banos')).toBe('2');
    expect(cuerpo.get('propietarioInmueble')).toBe('Ana Gómez');
    expect(cuerpo.get('precioPorNoche')).toBe('250000');
    expect(cuerpo.get('tarifaLimpieza')).toBe('0');
    expect(cuerpo.getAll('idsServicios')).toEqual(['s-1', 's-2']);
    expect((cuerpo.getAll('imagenes') as File[]).map((archivo) => archivo.name)).toEqual([
      'sala.jpg',
      'cocina.png',
    ]);
    peticion.flush({ estado: 'BORRADOR' });

    expect(estado).toBe('BORRADOR');
  });

  it('consulta mis publicaciones y el detalle de una de ellas', () => {
    servicio.misPublicaciones().subscribe();
    servicio.detalle('p 1').subscribe();
    backend
      .expectOne(`${api}/publicaciones/mis-publicaciones`)
      .flush({ mensaje: 'ok', publicaciones: [] });
    const detalle = backend.expectOne(`${api}/publicaciones/mis-publicaciones/p%201`);
    expect(detalle.request.method).toBe('GET');
    detalle.flush({});
  });

  it('descarga las imágenes como archivo desde el servidor', () => {
    servicio.imagen('/imagenes/publicaciones/a.jpg').subscribe();
    servicio.imagen('imagenes/publicaciones/b.jpg').subscribe();
    const primera = backend.expectOne(`${api}/imagenes/publicaciones/a.jpg`);
    expect(primera.request.responseType).toBe('blob');
    primera.flush(new Blob(['a']));
    backend.expectOne(`${api}/imagenes/publicaciones/b.jpg`).flush(new Blob(['b']));
  });

  it('edita la publicación con PUT y sin imágenes si no se cambian', () => {
    servicio
      .editar('p 9', {
        titulo: 'Cabaña',
        descripcion: 'Junto al lago',
        reglas: 'No fumar',
        ubicacion: 'Vereda El Lago',
        ciudad: 'Guatavita',
        tipoAlojamiento: 'Cabaña',
        capacidad: 4,
        habitaciones: 2,
        camas: 3,
        banos: 2,
        propietarioInmueble: '',
        precioPorNoche: 250000,
        tarifaLimpieza: 0,
        modoAceptacion: 'APROBACION',
        idPolitica: 'p-1',
        idsServicios: ['s-1'],
        imagenes: [],
      })
      .subscribe();

    const peticion = backend.expectOne(`${api}/publicaciones/p%209`);
    expect(peticion.request.method).toBe('PUT');
    const cuerpo = peticion.request.body as FormData;
    expect(cuerpo.get('modoAceptacion')).toBe('APROBACION');
    expect(cuerpo.getAll('imagenes')).toEqual([]);
    peticion.flush({});
  });

  it('envía una publicación a revisión', () => {
    servicio.enviarRevision('p 1').subscribe();
    const peticion = backend.expectOne(`${api}/publicaciones/p%201/enviar-revision`);
    expect(peticion.request.method).toBe('PATCH');
    peticion.flush({ estadoActual: 'PENDIENTE_REVISION' });
  });

  it('pausa y reactiva una publicación', () => {
    servicio.pausar('p-1').subscribe();
    servicio.reactivar('p-1').subscribe();
    expect(backend.expectOne(`${api}/publicaciones/p-1/pausar`).request.method).toBe('PATCH');
    expect(backend.expectOne(`${api}/publicaciones/p-1/reactivar`).request.method).toBe('PATCH');
  });

  it('consulta y cambia la política de cancelación de una publicación', () => {
    servicio.politicaDe('p-1').subscribe();
    servicio.cambiarPolitica('p-1', 'pol-2').subscribe();
    const consulta = backend.expectOne(
      (peticion) => peticion.method === 'GET' && peticion.url.endsWith('/p-1/politica-cancelacion'),
    );
    const cambio = backend.expectOne(
      (peticion) =>
        peticion.method === 'PATCH' && peticion.url.endsWith('/p-1/politica-cancelacion'),
    );
    expect(cambio.request.body).toEqual({ idPolitica: 'pol-2' });
    consulta.flush({});
    cambio.flush({});
  });

  it('consulta y guarda la configuración comercial', () => {
    const datos = { tarifaLimpieza: 0, serviciosAdicionales: [] };
    servicio.configuracionComercial('p-1').subscribe();
    servicio.guardarConfiguracionComercial('p-1', datos).subscribe();
    const consulta = backend.expectOne(
      (peticion) =>
        peticion.method === 'GET' && peticion.url.endsWith('/p-1/configuracion-comercial'),
    );
    const guardado = backend.expectOne(
      (peticion) =>
        peticion.method === 'PUT' && peticion.url.endsWith('/p-1/configuracion-comercial'),
    );
    expect(guardado.request.body).toEqual(datos);
    consulta.flush({});
    guardado.flush({});
  });

  it('consulta y cambia el modo de aceptación', () => {
    servicio.modoAceptacionDe('p-1').subscribe();
    servicio.cambiarModoAceptacion('p-1', 'APROBACION').subscribe();
    const consulta = backend.expectOne(
      (peticion) => peticion.method === 'GET' && peticion.url.endsWith('/p-1/modo-aceptacion'),
    );
    const cambio = backend.expectOne(
      (peticion) => peticion.method === 'PATCH' && peticion.url.endsWith('/p-1/modo-aceptacion'),
    );
    expect(cambio.request.body).toEqual({ modoAceptacion: 'APROBACION' });
    consulta.flush({});
    cambio.flush({});
  });
});
