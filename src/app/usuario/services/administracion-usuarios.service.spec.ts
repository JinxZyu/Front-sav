import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdministracionUsuariosService } from './administracion-usuarios.service';

describe('AdministracionUsuariosService', () => {
  const api = `${environment.apiUrl}/administracion/usuarios`;
  let servicio: AdministracionUsuariosService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(AdministracionUsuariosService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('lista los usuarios', () => {
    let total = 0;
    servicio.listar().subscribe((usuarios) => (total = usuarios.length));
    const peticion = backend.expectOne(api);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([{ idUsuario: '1' }, { idUsuario: '2' }]);
    expect(total).toBe(2);
  });

  it('restringe una cuenta con su motivo', () => {
    servicio.restringir('abc-1', 'Fraude').subscribe();
    const peticion = backend.expectOne(`${api}/abc-1/restringir`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({ motivo: 'Fraude' });
    peticion.flush('ok');
  });

  it('levanta la restricción de una cuenta', () => {
    servicio.levantarRestriccion('abc-1').subscribe();
    const peticion = backend.expectOne(`${api}/abc-1/levantar-restriccion`);
    expect(peticion.request.method).toBe('PATCH');
    peticion.flush('ok');
  });

  it('reactiva una cuenta bloqueada por intentos usando el correo', () => {
    servicio.reactivarBloqueo('ana+1@correo.com').subscribe();
    const peticion = backend.expectOne((r) => r.url === `${api}/reactivar-bloqueo`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.params.get('correo')).toBe('ana+1@correo.com');
    peticion.flush('ok');
  });
});
