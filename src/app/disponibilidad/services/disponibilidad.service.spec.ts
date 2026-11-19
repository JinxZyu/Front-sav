import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { DisponibilidadService } from './disponibilidad.service';

describe('DisponibilidadService', () => {
  let servicio: DisponibilidadService;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/alojamientos/a-1/periodos-disponibles`;
  const periodo = { fechaInicio: '2026-12-01', fechaFin: '2026-12-05' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(DisponibilidadService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('consulta y registra periodos', () => {
    servicio.periodos('a-1').subscribe();
    servicio.crearPeriodo('a-1', periodo).subscribe();
    const consulta = backend.expectOne((peticion) => peticion.method === 'GET');
    const registro = backend.expectOne((peticion) => peticion.method === 'POST');
    expect(consulta.request.url).toBe(url);
    expect(registro.request.body).toEqual(periodo);
    consulta.flush([]);
    registro.flush({});
  });

  it('actualiza y deshabilita un periodo', () => {
    servicio.actualizarPeriodo('a-1', 'p 1', periodo).subscribe();
    servicio.deshabilitarPeriodo('a-1', 'p 1').subscribe();
    const cambio = backend.expectOne((peticion) => peticion.method === 'PUT');
    const baja = backend.expectOne((peticion) => peticion.method === 'DELETE');
    expect(cambio.request.url).toBe(`${url}/p%201`);
    expect(baja.request.url).toBe(`${url}/p%201`);
    cambio.flush({});
    baja.flush({});
  });

  it('consulta el calendario y la disponibilidad por fechas', () => {
    servicio.calendario('a-1').subscribe();
    servicio.consultar('a-1', '2026-12-01', '2026-12-05').subscribe();
    backend.expectOne(`${environment.apiUrl}/alojamientos/a-1/calendario`).flush({});
    const consulta = backend.expectOne(
      (peticion) => peticion.url === `${environment.apiUrl}/alojamientos/a-1/disponibilidad`,
    );
    expect(consulta.request.params.get('fechaInicio')).toBe('2026-12-01');
    expect(consulta.request.params.get('fechaFin')).toBe('2026-12-05');
    consulta.flush({});
  });
});
