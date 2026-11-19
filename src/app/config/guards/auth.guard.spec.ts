import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  CanMatchFn,
  Route,
  Router,
  RouterOutlet,
  UrlSegment,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { SesionService } from '../auth/sesion.service';
import { crearToken } from '../auth/sesion.testing';
import { autenticadoGuard, paginaInicial, rolGuard, sinSesionGuard } from './auth.guard';

@Component({ template: '' })
class PaginaVacia {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class PanelVacio {}

describe('guards de sesión', () => {
  let sesion: SesionService;
  let router: Router;

  const segmentos = [new UrlSegment('reservas', {}), new UrlSegment('mias', {})];

  const ejecutar = (guard: CanMatchFn) =>
    TestBed.runInInjectionContext(() =>
      guard({} as Route, segmentos, {} as Parameters<CanMatchFn>[2]),
    );

  const entrarComo = (role: string) =>
    sesion.iniciar(crearToken({ sub: 'a@b.co', role, exp: Math.floor(Date.now() / 1000) + 3600 }));

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'privado', canMatch: [autenticadoGuard], component: PaginaVacia },
          { path: 'admin', canMatch: [rolGuard('ADMINISTRADOR')], component: PaginaVacia },
          { path: '**', component: PaginaVacia },
        ]),
      ],
    });
    sesion = TestBed.inject(SesionService);
    router = TestBed.inject(Router);
  });

  describe('autenticadoGuard', () => {
    it('manda al login recordando la página pedida', () => {
      const resultado = ejecutar(autenticadoGuard) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/usuario/login?volverA=%2Freservas%2Fmias');
    });

    it('recuerda la URL completa durante una navegación real', async () => {
      await router.navigateByUrl('/privado?pagina=2');
      expect(router.url).toBe('/usuario/login?volverA=%2Fprivado%3Fpagina%3D2');
    });

    it('deja pasar si hay sesión', async () => {
      entrarComo('HUESPED');
      expect(ejecutar(autenticadoGuard)).toBe(true);
      await router.navigateByUrl('/privado');
      expect(router.url).toBe('/privado');
    });
  });

  describe('rolGuard', () => {
    it('manda al login recordando la página pedida si no hay sesión', async () => {
      await router.navigateByUrl('/admin');
      expect(router.url).toBe('/usuario/login?volverA=%2Fadmin');
    });

    it('deja pasar si el rol está permitido', () => {
      entrarComo('ANFITRION');
      expect(ejecutar(rolGuard('ANFITRION', 'ADMINISTRADOR'))).toBe(true);
    });

    it('criterio 2: rechaza el rol no permitido y lleva a la página principal', () => {
      entrarComo('HUESPED');
      const resultado = ejecutar(rolGuard('ADMINISTRADOR')) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/publicaciones');
    });

    it('al anfitrión con un rol no permitido lo lleva a sus alojamientos', () => {
      entrarComo('ANFITRION');
      const resultado = ejecutar(rolGuard('ADMINISTRADOR')) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/alojamientos');
    });

    it('usa los segmentos cuando no hay navegación en curso', () => {
      const resultado = ejecutar(rolGuard('ADMINISTRADOR')) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/usuario/login?volverA=%2Freservas%2Fmias');
    });
  });

  describe('sinSesionGuard', () => {
    const ejecutarSinSesion = () =>
      TestBed.runInInjectionContext(() =>
        sinSesionGuard(
          {} as Parameters<typeof sinSesionGuard>[0],
          {} as Parameters<typeof sinSesionGuard>[1],
        ),
      );

    it('deja ver el inicio de sesión y el registro si no hay sesión', () => {
      expect(ejecutarSinSesion()).toBe(true);
    });

    it('con sesión iniciada no deja volver y lleva a los alojamientos', () => {
      entrarComo('HUESPED');
      expect(router.serializeUrl(ejecutarSinSesion() as UrlTree)).toBe('/publicaciones');
    });

    it('con sesión de anfitrión lleva a sus alojamientos', () => {
      entrarComo('ANFITRION');
      expect(router.serializeUrl(ejecutarSinSesion() as UrlTree)).toBe('/alojamientos');
    });
  });

  describe('paginaInicial', () => {
    it('sin sesión es el inicio de sesión', () => {
      expect(TestBed.runInInjectionContext(paginaInicial)).toBe('/usuario/login');
    });

    it('con sesión son los alojamientos', () => {
      entrarComo('HUESPED');
      expect(TestBed.runInInjectionContext(paginaInicial)).toBe('/publicaciones');
    });

    it('para un anfitrión son sus alojamientos', () => {
      entrarComo('ANFITRION');
      expect(TestBed.runInInjectionContext(paginaInicial)).toBe('/alojamientos');
    });
  });
});

describe('sinSesionGuard al navegar entre las pantallas de acceso', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'publicaciones', component: PaginaVacia },
          {
            path: 'usuario',
            canActivateChild: [sinSesionGuard],
            component: PanelVacio,
            children: [
              { path: 'login', component: PaginaVacia },
              { path: 'registro', component: PaginaVacia },
            ],
          },
        ]),
      ],
    });
  });

  it('se vuelve a evaluar al cambiar de login a registro con la sesión ya iniciada', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/usuario/login');
    expect(router.url).toBe('/usuario/login');

    TestBed.inject(SesionService).iniciar(
      crearToken({ sub: 'a@b.co', role: 'HUESPED', exp: Math.floor(Date.now() / 1000) + 3600 }),
    );
    await router.navigateByUrl('/usuario/registro');

    expect(router.url).toBe('/publicaciones');
  });
});
