import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SesionService } from '../../../config/auth/sesion.service';
import { crearToken } from '../../../config/auth/sesion.testing';
import { Login } from './login';

describe('Login (HU-002)', () => {
  let fixture: ComponentFixture<Login>;
  let componente: Login;
  let backend: HttpTestingController;
  let router: Router;
  let sesion: SesionService;
  const urlLogin = `${environment.apiUrl}/autenticacion/login`;
  const urlReactivar = `${environment.apiUrl}/autenticacion/reactivar`;
  const token = crearToken({
    sub: 'ana@correo.com',
    role: 'ANFITRION',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const crear = async (volverA?: string, correo?: string, aviso?: string) => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({
                ...(volverA ? { volverA } : {}),
                ...(correo ? { correo } : {}),
                ...(aviso ? { aviso } : {}),
              }),
            },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(Login);
    componente = fixture.componentInstance;
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    sesion = TestBed.inject(SesionService);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
  };

  const llenar = () =>
    componente.formulario.setValue({ correo: 'Ana@Correo.com', contrasena: 'clave-segura' });

  const fallarLogin = (mensaje: string, status: number) =>
    backend.expectOne(urlLogin).flush(mensaje, { status, statusText: 'Error' });

  const textoPantalla = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  afterEach(() => backend.verify());

  it('criterio 4: exige correo y contraseña', async () => {
    await crear();
    componente.iniciarSesion();
    await fixture.whenStable();

    backend.expectNone(urlLogin);
    expect(textoPantalla()).toContain('Ingresa un correo válido');
    expect(textoPantalla()).toContain('La contraseña es obligatoria');
  });

  it('criterios 1 y 5: inicia sesión, guarda el rol y entra a la app', async () => {
    await crear();
    llenar();
    componente.iniciarSesion();

    const peticion = backend.expectOne(urlLogin);
    expect(peticion.request.body).toEqual({ correo: 'ana@correo.com', contrasena: 'clave-segura' });
    peticion.flush({ token, tipo: 'Bearer' });

    expect(sesion.autenticado()).toBe(true);
    expect(sesion.rol()).toBe('ANFITRION');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/alojamientos');
  });

  it('un huésped entra al listado de alojamientos', async () => {
    await crear();
    llenar();
    componente.iniciarSesion();
    backend.expectOne(urlLogin).flush({
      token: crearToken({
        sub: 'ana@correo.com',
        role: 'HUESPED',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
      tipo: 'Bearer',
    });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/publicaciones');
  });

  it('un huésped vuelve a la página que pedía antes de iniciar sesión', async () => {
    await crear('/reservas');
    llenar();
    componente.iniciarSesion();
    backend.expectOne(urlLogin).flush({
      token: crearToken({
        sub: 'ana@correo.com',
        role: 'HUESPED',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
      tipo: 'Bearer',
    });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/reservas');
  });

  it('un anfitrión siempre entra a sus alojamientos aunque viniera de otra página', async () => {
    await crear('/disponibilidad/p-1');
    llenar();
    componente.iniciarSesion();
    backend.expectOne(urlLogin).flush({ token, tipo: 'Bearer' });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/alojamientos');
  });

  it('criterio 2: informa que las credenciales no son válidas', async () => {
    await crear();
    llenar();
    componente.iniciarSesion();
    fallarLogin('Correo o contraseña incorrectos.', 401);
    await fixture.whenStable();

    expect(sesion.autenticado()).toBe(false);
    expect(textoPantalla()).toContain('Correo o contraseña incorrectos.');
  });

  it('criterio 3: impide el acceso a una cuenta restringida', async () => {
    await crear();
    llenar();
    componente.iniciarSesion();
    fallarLogin('Tu cuenta tiene una restricción administrativa. No puedes iniciar sesión.', 403);

    expect(componente.estadoCuenta()).toBe('normal');
    expect(componente.error()).toContain('restricción administrativa');
  });

  it('criterio 6: informa que la cuenta bloqueada debe reactivarla un Administrador', async () => {
    await crear();
    llenar();
    componente.iniciarSesion();
    fallarLogin(
      'Tu cuenta está bloqueada por intentos fallidos. Debes solicitar su reactivación a un Administrador.',
      403,
    );

    expect(componente.error()).toContain('Administrador');
  });

  it('criterio 7: con la cuenta desactivada solo ofrece reactivarla', async () => {
    await crear();
    llenar();
    componente.iniciarSesion();
    fallarLogin('Tu cuenta está desactivada.', 403);
    await fixture.whenStable();

    expect(componente.estadoCuenta()).toBe('desactivada');
    expect(textoPantalla()).toContain('Reactivar mi cuenta');
    expect(textoPantalla()).not.toContain('Iniciar sesión\n');
    expect(sesion.autenticado()).toBe(false);
  });

  it('criterio 7: reactiva la cuenta y pide iniciar sesión de nuevo', async () => {
    await crear();
    llenar();
    componente.reactivar();

    const peticion = backend.expectOne(urlReactivar);
    expect(peticion.request.body).toEqual({ correo: 'ana@correo.com', contrasena: 'clave-segura' });
    peticion.flush('Tu cuenta ha sido reactivada correctamente. Inicia sesión nuevamente.');

    await fixture.whenStable();

    expect(componente.estadoCuenta()).toBe('normal');
    expect(textoPantalla()).toContain('reactivada');
  });

  it('usa un aviso por defecto si la reactivación no trae texto', async () => {
    await crear();
    llenar();
    componente.reactivar();
    backend.expectOne(urlReactivar).flush('');

    expect(componente.aviso()).toContain('reactivada');
  });

  it('muestra el error si no se puede reactivar', async () => {
    await crear();
    llenar();
    componente.reactivar();
    backend.expectOne(urlReactivar).flush('Tu cuenta tiene una restricción administrativa.', {
      status: 403,
      statusText: 'Forbidden',
    });

    expect(componente.error()).toContain('restricción administrativa');
  });

  it('si falta verificar el correo, lleva a la verificación', async () => {
    await crear();
    llenar();
    componente.iniciarSesion();
    fallarLogin('Debes verificar tu correo antes de iniciar sesión.', 403);

    await fixture.whenStable();

    expect(componente.estadoCuenta()).toBe('sin-verificar');
    expect(textoPantalla()).toContain('Verificar mi correo');
    componente.irAVerificar();
    expect(router.navigate).toHaveBeenCalledWith(['/usuario/verificar-correo'], {
      queryParams: { correo: 'ana@correo.com' },
    });
  });

  it('muestra un mensaje claro si el backend rechaza el formato (400)', async () => {
    await crear();
    llenar();
    componente.iniciarSesion();
    backend
      .expectOne(urlLogin)
      .flush({ error: 'Bad Request' }, { status: 400, statusText: 'Bad Request' });

    expect(componente.error()).toBe('Revisa el correo y la contraseña.');
  });

  it('marca los campos con error como aria-invalid', async () => {
    await crear();
    componente.iniciarSesion();
    await fixture.whenStable();

    const correo = (fixture.nativeElement as HTMLElement).querySelector(
      'input[formControlName="correo"]',
    );
    expect(correo?.getAttribute('aria-invalid')).toBe('true');
  });

  it('cancela el inicio de sesión si el usuario sale de la pantalla', async () => {
    await crear();
    llenar();
    componente.iniciarSesion();
    const peticion = backend.expectOne(urlLogin);

    fixture.destroy();

    expect(peticion.cancelled).toBe(true);
    expect(sesion.autenticado()).toBe(false);
  });

  it('cancela la reactivación si el usuario sale de la pantalla', async () => {
    await crear();
    llenar();
    componente.reactivar();
    const peticion = backend.expectOne(urlReactivar);

    fixture.destroy();

    expect(peticion.cancelled).toBe(true);
  });

  it('vuelve a mostrar el botón de iniciar sesión si cambian las credenciales', async () => {
    await crear();
    llenar();
    componente.iniciarSesion();
    fallarLogin('Tu cuenta está desactivada.', 403);
    expect(componente.estadoCuenta()).toBe('desactivada');

    componente.formulario.controls.correo.setValue('otra@correo.com');
    await fixture.whenStable();

    expect(componente.estadoCuenta()).toBe('normal');
    expect(textoPantalla()).not.toContain('Reactivar mi cuenta');
  });

  it('descarta la respuesta si las credenciales cambiaron mientras se esperaba', async () => {
    await crear();
    llenar();
    componente.iniciarSesion();
    componente.formulario.controls.correo.setValue('otra@correo.com');

    fallarLogin('Tu cuenta está desactivada.', 403);

    expect(componente.estadoCuenta()).toBe('normal');
    expect(componente.error()).toBeNull();
  });

  it('no redirige a una dirección externa', async () => {
    await crear('//sitio-malicioso.com');
    llenar();
    componente.iniciarSesion();
    backend.expectOne(urlLogin).flush({ token, tipo: 'Bearer' });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/alojamientos');
  });

  it('ofrece recuperar la contraseña llevando el correo escrito', async () => {
    await crear();
    componente.formulario.controls.correo.setValue('ana@correo.com');
    await fixture.whenStable();

    const enlace = (fixture.nativeElement as HTMLElement).querySelector('a.enlace-secundario');
    expect(enlace?.textContent).toContain('¿Olvidaste tu contraseña?');
    expect(enlace?.getAttribute('href')).toContain(
      '/usuario/recuperar-contrasena?correo=ana@correo.com',
    );
  });

  it('toma el correo de la URL al llegar desde la verificación', async () => {
    await crear(undefined, 'ana@correo.com');
    expect(componente.formulario.controls.correo.value).toBe('ana@correo.com');
  });

  it('muestra un botón para ver la contraseña', async () => {
    await crear();
    const elemento = fixture.nativeElement as HTMLElement;
    const campo = elemento.querySelector<HTMLInputElement>('input[formControlName="contrasena"]');
    elemento.querySelector<HTMLButtonElement>('app-campo-contrasena button')?.click();
    await fixture.whenStable();
    expect(campo?.type).toBe('text');
  });

  it('avisa que el correo se actualizó al llegar desde Mi cuenta', async () => {
    await crear(undefined, 'nuevo@correo.com', 'correo-actualizado');
    expect(componente.formulario.controls.correo.value).toBe('nuevo@correo.com');
    expect(componente.aviso()).toBe('Tu correo se actualizó. Inicia sesión con tu nuevo correo.');
  });

  it('ignora avisos desconocidos en la URL', async () => {
    await crear(undefined, undefined, 'cualquier-cosa');
    expect(componente.aviso()).toBeNull();
  });

  it('avisa que la cuenta se desactivó al llegar desde Mi cuenta', async () => {
    await crear(undefined, undefined, 'cuenta-desactivada');
    expect(componente.aviso()).toContain('Tu cuenta fue desactivada');
  });
});
