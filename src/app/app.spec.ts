import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { SesionService } from './config/auth/sesion.service';
import { crearToken } from './config/auth/sesion.testing';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  const crear = async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture;
  };

  const texto = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement.textContent ?? '';

  it('sin sesión muestra las opciones para entrar o registrarse', async () => {
    const fixture = await crear();

    const logo = fixture.nativeElement.querySelector('.marca img') as HTMLImageElement;
    expect(logo.alt).toBe('SAV');
    expect(texto(fixture)).toContain('Alojamientos');
    expect(texto(fixture)).toContain('Iniciar sesión');
    expect(texto(fixture)).toContain('Registrarse');
  });

  it('con sesión muestra el correo y el rol, y permite cerrar sesión', async () => {
    const sesion = TestBed.inject(SesionService);
    sesion.iniciar(
      crearToken({ sub: 'ana@correo.com', role: 'ANFITRION', exp: Math.floor(Date.now() / 1000) + 3600 }),
    );
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = await crear();

    expect(texto(fixture)).toContain('ana@correo.com · Anfitrión');

    fixture.componentInstance.cerrarSesion();
    await fixture.whenStable();

    expect(sesion.autenticado()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/usuario/login');
    expect(texto(fixture)).toContain('Registrarse');
  });

  it('no muestra rol si la sesión no tiene uno válido', () => {
    const fixture = TestBed.createComponent(App);
    expect((fixture.componentInstance as unknown as { nombreRol: () => string }).nombreRol()).toBe('');
  });
});
