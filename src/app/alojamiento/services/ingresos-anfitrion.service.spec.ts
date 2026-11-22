import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { IngresosAnfitrionService } from './ingresos-anfitrion.service';

describe('IngresosAnfitrionService', () => {
  it('consulta los ingresos del anfitrión en el backend', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const backend = TestBed.inject(HttpTestingController);
    let recibido: unknown;

    TestBed.inject(IngresosAnfitrionService)
      .consultar()
      .subscribe((datos) => (recibido = datos));
    const peticion = backend.expectOne(`${environment.apiUrl}/anfitrion/ingresos`);
    peticion.flush({ resumen: { reservasConPago: 0 }, publicaciones: [] });

    expect(peticion.request.method).toBe('GET');
    expect(recibido).toEqual({ resumen: { reservasConPago: 0 }, publicaciones: [] });
    backend.verify();
  });
});
