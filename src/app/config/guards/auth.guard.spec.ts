import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CanMatchFn, Route, Router, UrlSegment, UrlTree, provideRouter } from '@angular/router';
import { SesionService } from '../auth/sesion.service';
import { crearToken } from '../auth/sesion.testing';
import { autenticadoGuard, rolGuard } from './auth.guard';

@Component({ template: '' })
class PaginaVacia {}

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

    it('manda al inicio si el rol no está permitido', () => {
      entrarComo('HUESPED');
      const resultado = ejecutar(rolGuard('ADMINISTRADOR')) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/');
    });

    it('usa los segmentos cuando no hay navegación en curso', () => {
      const resultado = ejecutar(rolGuard('ADMINISTRADOR')) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/usuario/login?volverA=%2Freservas%2Fmias');
    });
  });
});
