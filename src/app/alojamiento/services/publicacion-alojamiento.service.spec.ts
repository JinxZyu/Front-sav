import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PublicacionAlojamientoService } from './publicacion-alojamiento.service';

describe('PublicacionAlojamientoService', () => {
  const api = environment.apiUrl;
  let servicio: PublicacionAlojamientoService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(PublicacionAlojamientoService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('consulta los servicios y las políticas activas', () => {
    servicio.servicios().subscribe();
    servicio.politicas().subscribe();
    backend.expectOne(`${api}/servicios`).flush([]);
    backend.expectOne(`${api}/politicas-cancelacion/activas`).flush([]);
  });

  it('envía la publicación como formulario con servicios e imágenes repetidos', () => {
    const imagen1 = new File(['a'], 'sala.jpg', { type: 'image/jpeg' });
    const imagen2 = new File(['b'], 'cocina.png', { type: 'image/png' });
    let estado = '';
    servicio
      .crear({
        titulo: 'Cabaña',
        descripcion: 'Junto al lago',
        reglas: 'No fumar',
        ubicacion: 'Vereda El Lago',
        ciudad: 'Guatavita',
        tipoAlojamiento: 'Cabaña',
        capacidad: 4,
        precioPorNoche: 250000,
        tarifaLimpieza: 0,
        modoAceptacion: 'INMEDIATA',
        idPolitica: 'p-1',
        idsServicios: ['s-1', 's-2'],
        imagenes: [imagen1, imagen2],
      })
      .subscribe((respuesta) => (estado = respuesta.estado));

    const peticion = backend.expectOne(`${api}/alojamientos`);
    expect(peticion.request.method).toBe('POST');
    const cuerpo = peticion.request.body as FormData;
    expect(cuerpo.get('titulo')).toBe('Cabaña');
    expect(cuerpo.get('capacidad')).toBe('4');
    expect(cuerpo.get('precioPorNoche')).toBe('250000');
    expect(cuerpo.get('tarifaLimpieza')).toBe('0');
    expect(cuerpo.getAll('idsServicios')).toEqual(['s-1', 's-2']);
    expect((cuerpo.getAll('imagenes') as File[]).map((archivo) => archivo.name)).toEqual([
      'sala.jpg',
      'cocina.png',
    ]);
    peticion.flush({ estado: 'BORRADOR' });

    expect(estado).toBe('BORRADOR');
  });
});
