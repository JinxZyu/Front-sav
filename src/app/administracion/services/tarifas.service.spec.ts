import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { configuracionTarifa } from '../models/tarifa.testing';
import { TarifasService } from './tarifas.service';

describe('TarifasService', () => {
  let servicio: TarifasService;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/administracion/tarifas/configuracion-vigente`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(TarifasService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('consulta la configuración vigente', () => {
    let respuesta: unknown;
    servicio.vigente().subscribe((datos) => (respuesta = datos));

    const peticion = backend.expectOne(api);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(configuracionTarifa());

    expect(respuesta).toEqual(configuracionTarifa());
  });

  it('guarda los nuevos porcentajes', () => {
    servicio.configurar({ porcentajeServicio: 12.5, porcentajeDescuento: 5 }).subscribe();

    const peticion = backend.expectOne(api);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({ porcentajeServicio: 12.5, porcentajeDescuento: 5 });
    peticion.flush(configuracionTarifa());
  });
});
