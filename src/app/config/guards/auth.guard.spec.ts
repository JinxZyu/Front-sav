import { TestBed } from '@angular/core/testing';
import { CanMatchFn, Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { SesionService } from '../auth/sesion.service';
import { crearToken } from '../auth/sesion.testing';
import { autenticadoGuard, rolGuard } from './auth.guard';

describe('guards de sesión', () => {
  let sesion: SesionService;
  let router: Router;

  const ejecutar = (guard: CanMatchFn) =>
    TestBed.runInInjectionContext(() => guard({} as Route, [] as UrlSegment[], {} as Parameters<CanMatchFn>[2]));

  const entrarComo = (role: string) =>
    sesion.iniciar(
      crearToken({ sub: 'a@b.co', role, exp: Math.floor(Date.now() / 1000) + 3600 }),
    );

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    sesion = TestBed.inject(SesionService);
    router = TestBed.inject(Router);
  });

  describe('autenticadoGuard', () => {
    it('manda al login si no hay sesión', () => {
      const resultado = ejecutar(autenticadoGuard) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/usuario/login');
    });

    it('deja pasar si hay sesión', () => {
      entrarComo('HUESPED');
      expect(ejecutar(autenticadoGuard)).toBe(true);
    });
  });

  describe('rolGuard', () => {
    it('manda al login si no hay sesión', () => {
      const resultado = ejecutar(rolGuard('ANFITRION')) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/usuario/login');
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
  });
});
