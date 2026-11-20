import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ReservaService } from './reserva.service';

describe('ReservaService', () => {
  let servicio: ReservaService;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/reservas`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(ReservaService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  const clave = (peticion: ReturnType<HttpTestingController['expectOne']>) =>
    peticion.request.headers.get('Idempotency-Key');

  it('reintenta una solicitud fallida con la misma clave de idempotencia', () => {
    servicio.solicitar('c-1').subscribe({ error: () => undefined });
    const primera = backend.expectOne(api);
    const usada = clave(primera);
    primera.flush(null, { status: 0, statusText: 'Unknown Error' });

    servicio.solicitar('c-1').subscribe();
    const segunda = backend.expectOne(api);
    expect(clave(segunda)).toBe(usada);
    segunda.flush({ idReserva: 'r-1' });

    servicio.solicitar('c-1').subscribe();
    const tercera = backend.expectOne(api);
    expect(clave(tercera)).not.toBe(usada);
    tercera.flush({ idReserva: 'r-1' });
  });
});
