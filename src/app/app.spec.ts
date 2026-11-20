import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { SesionService } from './config/auth/sesion.service';
import { crearToken } from './config/auth/sesion.testing';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  const crear = async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture;
  };

  const elemento = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement;

  it('sin sesión muestra las opciones para entrar o registrarse', async () => {
    const fixture = await crear();

    const logo = elemento(fixture).querySelector('.marca img') as HTMLImageElement;
    expect(logo.alt).toBe('SAV');
    expect(elemento(fixture).textContent).toContain('Alojamientos');
    expect(elemento(fixture).textContent).toContain('Iniciar sesión');
    expect(elemento(fixture).textContent).toContain('Registrarse');
    expect(elemento(fixture).querySelector('app-menu-usuario')).toBeNull();
  });

  it('con sesión muestra el menú del usuario en lugar de entrar o registrarse', async () => {
    TestBed.inject(SesionService).iniciar(
      crearToken({
        sub: 'ana@correo.com',
        role: 'ANFITRION',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(() => true)
      .flush({ nombre: 'Ana', apellido: 'Pérez' });
    await fixture.whenStable();

    expect(elemento(fixture).querySelector('app-menu-usuario')).not.toBeNull();
    expect(elemento(fixture).textContent).not.toContain('Registrarse');
  });

  it('al anfitrión la barra le lleva a sus alojamientos', async () => {
    TestBed.inject(SesionService).iniciar(
      crearToken({
        sub: 'ana@correo.com',
        role: 'ANFITRION',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(() => true)
      .flush({ nombre: 'Ana', apellido: 'Pérez' });
    await fixture.whenStable();

    const enlace = elemento(fixture).querySelector('nav > a') as HTMLAnchorElement;
    expect(enlace.textContent?.trim()).toBe('Mis alojamientos');
    expect(enlace.getAttribute('href')).toBe('/alojamientos');
  });

  it('al huésped la barra le lleva al listado general de alojamientos', async () => {
    TestBed.inject(SesionService).iniciar(
      crearToken({
        sub: 'ana@correo.com',
        role: 'HUESPED',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(() => true)
      .flush({ nombre: 'Ana', apellido: 'Pérez' });
    await fixture.whenStable();

    const enlace = elemento(fixture).querySelector('nav > a') as HTMLAnchorElement;
    expect(enlace.textContent?.trim()).toBe('Alojamientos');
    expect(enlace.getAttribute('href')).toBe('/publicaciones');
  });
});
