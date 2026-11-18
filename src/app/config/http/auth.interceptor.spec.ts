import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SesionService } from '../auth/sesion.service';
import { crearToken } from '../auth/sesion.testing';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let sesion: SesionService;
  let router: Router;

  const urlBackend = `${environment.apiUrl}/usuarios/mi_cuenta`;
  const token = crearToken({
    sub: 'a@b.co',
    role: 'HUESPED',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    sesion = TestBed.inject(SesionService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => backend.verify());

  it('agrega el token a las peticiones al backend', () => {
    sesion.iniciar(token);
    http.get(urlBackend).subscribe();

    const peticion = backend.expectOne(urlBackend);
    expect(peticion.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    peticion.flush({});
  });

  it('no agrega token si no hay sesión', () => {
    http.get(urlBackend).subscribe();

    const peticion = backend.expectOne(urlBackend);
    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush({});
  });

  it('no envía el token a otros sitios', () => {
    sesion.iniciar(token);
    http.get('https://otro-sitio.com/datos').subscribe();

    const peticion = backend.expectOne('https://otro-sitio.com/datos');
    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush({});
  });

  it('cierra la sesión y manda al login si el backend responde 401', () => {
    sesion.iniciar(token);
    let fallo = false;
    http.get(urlBackend).subscribe({ error: () => (fallo = true) });

    backend.expectOne(urlBackend).flush('No autorizado', { status: 401, statusText: 'Unauthorized' });

    expect(fallo).toBe(true);
    expect(sesion.autenticado()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/usuario/login');
  });

  it('no cierra la sesión con otros errores', () => {
    sesion.iniciar(token);
    http.get(urlBackend).subscribe({ error: () => undefined });

    backend.expectOne(urlBackend).flush('Error', { status: 500, statusText: 'Server Error' });

    expect(sesion.autenticado()).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('no cierra una sesión nueva por un 401 tardío de la sesión anterior', () => {
    sesion.iniciar(token);
    http.get(urlBackend).subscribe({ error: () => undefined });
    const nuevoToken = crearToken({
      sub: 'otro@b.co',
      role: 'ANFITRION',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    sesion.iniciar(nuevoToken);

    backend.expectOne(urlBackend).flush('No autorizado', { status: 401, statusText: 'Unauthorized' });

    expect(sesion.token()).toBe(nuevoToken);
    expect(sesion.autenticado()).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
