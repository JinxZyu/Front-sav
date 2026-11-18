import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { RegistroRequest } from '../models/usuario.models';
import { AutenticacionService } from './autenticacion.service';

describe('AutenticacionService', () => {
  let servicio: AutenticacionService;
  let backend: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(AutenticacionService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('registrar envía los datos y recibe el texto del backend', () => {
    const datos = { correo: 'a@b.co' } as RegistroRequest;
    let respuesta = '';
    servicio.registrar(datos).subscribe((r) => (respuesta = r));

    const peticion = backend.expectOne(`${api}/autenticacion/registrar`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    peticion.flush('Usuario creado.');
    expect(respuesta).toBe('Usuario creado.');
  });

  it('confirmarCodigo manda correo y código como parámetros', () => {
    servicio.confirmarCodigo('a@b.co', '123456').subscribe();

    const peticion = backend.expectOne((r) => r.url === `${api}/verificacion-correo/confirmar`);
    expect(peticion.request.params.get('correo')).toBe('a@b.co');
    expect(peticion.request.params.get('codigo')).toBe('123456');
    peticion.flush('Correo verificado correctamente.');
  });

  it('reenviarCodigo manda el correo como parámetro', () => {
    servicio.reenviarCodigo('a@b.co').subscribe();

    const peticion = backend.expectOne((r) => r.url === `${api}/verificacion-correo/reenviar`);
    expect(peticion.request.params.get('correo')).toBe('a@b.co');
    peticion.flush('Se envió un nuevo código.');
  });
});
