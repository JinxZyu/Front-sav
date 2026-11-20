import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { UbicacionService } from './ubicacion.service';

describe('UbicacionService', () => {
  let servicio: UbicacionService;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/autenticacion/ubicaciones`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(UbicacionService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('consulta los países y los muestra en español, en orden alfabético', () => {
    let nombres: string[] = [];
    servicio.paises().subscribe((paises) => (nombres = paises.map((pais) => pais.nombre)));
    backend.expectOne(`${api}/paises`).flush([
      { idPais: 'p-es', codigoIso2: 'ES', nombre: 'Spain' },
      { idPais: 'p-co', codigoIso2: 'co', nombre: 'Colombia' },
      { idPais: 'p-de', codigoIso2: 'DE', nombre: 'Germany' },
      { idPais: 'p-xk', codigoIso2: '??', nombre: 'Desconocido' },
    ]);
    expect(nombres).toEqual(['Alemania', 'Colombia', 'Desconocido', 'España']);
  });

  it('entrega los códigos de país en mayúsculas', () => {
    let codigos: string[] = [];
    servicio.paises().subscribe((paises) => (codigos = paises.map((pais) => pais.codigoIso2)));
    backend
      .expectOne(`${api}/paises`)
      .flush([{ idPais: 'p-co', codigoIso2: ' co ', nombre: 'Colombia' }]);
    expect(codigos).toEqual(['CO']);
  });

  it('consulta las ciudades de un país', () => {
    servicio.ciudades('p co').subscribe();
    const peticion = backend.expectOne(`${api}/paises/p%20co/ciudades`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([{ idCiudad: 'c-1', nombre: 'Bogotá' }]);
  });
});
