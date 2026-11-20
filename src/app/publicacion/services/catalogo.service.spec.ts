import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { FiltrosBusqueda } from '../models/catalogo.models';
import { CatalogoService } from './catalogo.service';

describe('CatalogoService', () => {
  let servicio: CatalogoService;
  let backend: HttpTestingController;
  const api = environment.apiUrl;

  const vacios: FiltrosBusqueda = {
    ciudad: '',
    llegada: '',
    salida: '',
    huespedes: '',
    tipo: '',
    precioMinimo: '',
    precioMaximo: '',
    servicios: [],
    pagina: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(CatalogoService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('busca solo con los filtros que tienen valor', () => {
    servicio
      .buscar({
        ...vacios,
        ciudad: ' Cartagena ',
        llegada: '2026-12-01',
        salida: '2026-12-05',
        huespedes: '3',
        servicios: ['s-1', 's-2'],
        pagina: 2,
      })
      .subscribe();

    const peticion = backend.expectOne((p) => p.url === `${api}/publicaciones/busqueda`);
    const params = peticion.request.params;
    expect(params.get('ciudad')).toBe('Cartagena');
    expect(params.get('fechaInicio')).toBe('2026-12-01');
    expect(params.get('fechaFin')).toBe('2026-12-05');
    expect(params.get('capacidad')).toBe('3');
    expect(params.getAll('servicios')).toEqual(['s-1', 's-2']);
    expect(params.get('pagina')).toBe('2');
    expect(params.get('tamano')).toBe('12');
    expect(params.has('tipoAlojamiento')).toBe(false);
    expect(params.has('precioMinimo')).toBe(false);
    peticion.flush({});
  });

  it('consulta el detalle público y el catálogo de servicios', () => {
    servicio.detalle('p 1').subscribe();
    servicio.servicios().subscribe();

    backend.expectOne(`${api}/publicaciones/p%201/detalle-publico`).flush({});
    backend.expectOne(`${api}/servicios`).flush([]);
  });
});
