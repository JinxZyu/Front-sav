import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ReportesService } from './reportes.service';

describe('ReportesService', () => {
  let servicio: ReportesService;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/administracion/reportes/exportaciones`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(ReportesService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('solicita el reporte en el formato elegido', () => {
    servicio.solicitar('PDF').subscribe();

    const peticion = backend.expectOne(api);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ formato: 'PDF' });
    peticion.flush({});
  });

  it('consulta el estado del reporte', () => {
    servicio.consultar('e-1').subscribe();

    const peticion = backend.expectOne(`${api}/e-1`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({});
  });

  it('descarga el archivo como binario', () => {
    let archivo: Blob | undefined;
    servicio.descargar('e-1').subscribe((datos) => (archivo = datos));

    const peticion = backend.expectOne(`${api}/e-1/archivo`);
    expect(peticion.request.responseType).toBe('blob');
    const contenido = new Blob(['datos']);
    peticion.flush(contenido);

    expect(archivo).toBe(contenido);
  });
});
