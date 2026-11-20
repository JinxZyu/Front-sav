import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import {
  publicacionAdministrada,
  publicacionParaRevisar,
} from '../models/publicacion-administrada.testing';
import { GestionPublicacionesService } from './gestion-publicaciones.service';

describe('GestionPublicacionesService', () => {
  let servicio: GestionPublicacionesService;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/administracion/publicaciones`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(GestionPublicacionesService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('consulta todas las publicaciones', () => {
    let publicaciones: unknown;
    servicio.listar().subscribe((respuesta) => (publicaciones = respuesta));

    const peticion = backend.expectOne(api);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([publicacionAdministrada()]);

    expect(publicaciones).toEqual([publicacionAdministrada()]);
  });

  it('consulta el detalle de una publicación para revisarla', () => {
    let detalle: unknown;
    servicio.detalle('p/1').subscribe((respuesta) => (detalle = respuesta));

    const peticion = backend.expectOne(`${api}/p%2F1`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(publicacionParaRevisar());

    expect(detalle).toEqual(publicacionParaRevisar());
  });

  it('aprueba una publicación', () => {
    servicio.aprobar('p-1').subscribe();

    const peticion = backend.expectOne(`${api}/p-1/aprobar`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toBeNull();
    peticion.flush({});
  });

  it('rechaza una publicación con su motivo', () => {
    servicio.rechazar('p-1', 'Fotos de otro lugar').subscribe();

    const peticion = backend.expectOne(`${api}/p-1/rechazar`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({ motivo: 'Fotos de otro lugar' });
    peticion.flush({});
  });

  it('bloquea una publicación con su motivo', () => {
    servicio.bloquear('p-1', 'Información engañosa').subscribe();

    const peticion = backend.expectOne(`${api}/p-1/bloquear`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({ motivo: 'Información engañosa' });
    peticion.flush({});
  });

  it('desbloquea una publicación con su motivo', () => {
    servicio.desbloquear('p-1', 'El anfitrión corrigió las fotos').subscribe();

    const peticion = backend.expectOne(`${api}/p-1/desbloquear`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({ motivo: 'El anfitrión corrigió las fotos' });
    peticion.flush({});
  });

  it('consulta las reservas afectadas por el bloqueo', () => {
    let respuesta: unknown;
    servicio.reservasAfectadas('p-1').subscribe((datos) => (respuesta = datos));

    const peticion = backend.expectOne(`${api}/p-1/reservas-afectadas`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ mensaje: 'ok', reservas: [] });

    expect(respuesta).toEqual({ mensaje: 'ok', reservas: [] });
  });
});
