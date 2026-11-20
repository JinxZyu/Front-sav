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

  it('consulta un pago pendiente con la misma clave y la renueva al terminar', () => {
    const url = `${api}/r-1/pago-simulado`;
    servicio.pagar('r-1').subscribe();
    const primera = backend.expectOne(url);
    const usada = clave(primera);
    primera.flush({ estadoPago: 'PENDIENTE' });

    servicio.pagar('r-1').subscribe();
    const segunda = backend.expectOne(url);
    expect(clave(segunda)).toBe(usada);
    segunda.flush({ estadoPago: 'FALLIDO' });

    servicio.pagar('r-1').subscribe();
    const tercera = backend.expectOne(url);
    expect(clave(tercera)).not.toBe(usada);
    tercera.flush({ estadoPago: 'PAGADO' });
  });

  it('cancela con el motivo indicado', () => {
    servicio.cancelar('r-1', 'Cambio de planes').subscribe();
    const peticion = backend.expectOne(`${api}/r-1/cancelacion`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ motivo: 'Cambio de planes' });
    peticion.flush({});
  });
});
