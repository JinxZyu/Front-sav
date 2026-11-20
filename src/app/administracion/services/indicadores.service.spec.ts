import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { indicadores } from '../models/indicadores.testing';
import { IndicadoresService } from './indicadores.service';

describe('IndicadoresService', () => {
  it('consulta los indicadores del dashboard', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const backend = TestBed.inject(HttpTestingController);
    let respuesta: unknown;

    TestBed.inject(IndicadoresService)
      .consultar()
      .subscribe((datos) => (respuesta = datos));

    const peticion = backend.expectOne(
      `${environment.apiUrl}/administracion/dashboard/indicadores`,
    );
    expect(peticion.request.method).toBe('GET');
    peticion.flush(indicadores());
    expect(respuesta).toEqual(indicadores());
    backend.verify();
  });
});
