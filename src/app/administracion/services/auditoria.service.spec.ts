import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { FILTROS_AUDITORIA_VACIOS } from '../models/auditoria.models';
import { AuditoriaService } from './auditoria.service';

describe('AuditoriaService', () => {
  let servicio: AuditoriaService;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/administracion/auditoria/eventos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(AuditoriaService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('sin filtros solo pide la página', () => {
    servicio.consultar(FILTROS_AUDITORIA_VACIOS, 0).subscribe();

    const peticion = backend.expectOne((req) => req.url === api);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.keys().sort()).toEqual(['pagina', 'tamano']);
    expect(peticion.request.params.get('pagina')).toBe('0');
    expect(peticion.request.params.get('tamano')).toBe('20');
    peticion.flush({});
  });

  it('envía los filtros y toma los días completos en la zona del usuario', () => {
    servicio
      .consultar(
        {
          idUsuario: 'u-1',
          entidad: 'PUBLICACION',
          resultado: 'FALLIDO',
          desde: '2026-11-01',
          hasta: '2026-11-20',
        },
        2,
      )
      .subscribe();

    const peticion = backend.expectOne((req) => req.url === api);
    const { params } = peticion.request;
    expect(params.get('pagina')).toBe('2');
    expect(params.get('idUsuario')).toBe('u-1');
    expect(params.get('entidadAfectada')).toBe('PUBLICACION');
    expect(params.get('resultado')).toBe('FALLIDO');
    expect(params.get('desde')).toBe(new Date('2026-11-01T00:00:00').toISOString());
    expect(params.get('hasta')).toBe(new Date('2026-11-20T23:59:59.999').toISOString());
    peticion.flush({});
  });
});
