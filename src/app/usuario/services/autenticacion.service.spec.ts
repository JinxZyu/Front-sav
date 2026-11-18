import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TimeoutError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RegistroRequest } from '../models/usuario.models';
import { AutenticacionService, TIEMPO_ESPERA_RECUPERACION_MS } from './autenticacion.service';

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

  it('iniciarSesion envía las credenciales y recibe el token', () => {
    let token = '';
    servicio
      .iniciarSesion({ correo: 'a@b.co', contrasena: 'x' })
      .subscribe((r) => (token = r.token));

    const peticion = backend.expectOne(`${api}/autenticacion/login`);
    expect(peticion.request.body).toEqual({ correo: 'a@b.co', contrasena: 'x' });
    peticion.flush({ token: 'jwt', tipo: 'Bearer' });
    expect(token).toBe('jwt');
  });

  it('reactivarCuenta envía las credenciales y recibe el texto del backend', () => {
    let respuesta = '';
    servicio
      .reactivarCuenta({ correo: 'a@b.co', contrasena: 'x' })
      .subscribe((r) => (respuesta = r));

    backend.expectOne(`${api}/autenticacion/reactivar`).flush('Cuenta reactivada.');
    expect(respuesta).toBe('Cuenta reactivada.');
  });

  it('solicitarRecuperacion envía el correo', () => {
    let mensaje = '';
    servicio.solicitarRecuperacion('a@b.co').subscribe((r) => (mensaje = r.mensaje));

    const peticion = backend.expectOne(`${api}/recuperacion-contrasena/solicitar`);
    expect(peticion.request.body).toEqual({ correo: 'a@b.co' });
    peticion.flush({ mensaje: 'Revisa tu correo.' });
    expect(mensaje).toBe('Revisa tu correo.');
  });

  it('cancela la solicitud de recuperación si el servidor no responde a tiempo', () => {
    vi.useFakeTimers();
    try {
      let fallo: unknown;
      servicio
        .solicitarRecuperacion('a@b.co')
        .subscribe({ error: (error: unknown) => (fallo = error) });
      const peticion = backend.expectOne(`${api}/recuperacion-contrasena/solicitar`);
      vi.advanceTimersByTime(TIEMPO_ESPERA_RECUPERACION_MS);

      expect(peticion.cancelled).toBe(true);
      expect(fallo).toBeInstanceOf(TimeoutError);
    } finally {
      vi.useRealTimers();
    }
  });

  it('restablecerContrasena envía correo, código y contraseña nueva', () => {
    const datos = { correo: 'a@b.co', codigo: '123456', nuevaContrasena: 'nueva-clave' };
    servicio.restablecerContrasena(datos).subscribe();

    const peticion = backend.expectOne(`${api}/recuperacion-contrasena/restablecer`);
    expect(peticion.request.body).toEqual(datos);
    peticion.flush({ mensaje: 'La contraseña se ha actualizado correctamente.' });
  });
});
