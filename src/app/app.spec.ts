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
      .expectOne((peticion) => peticion.url.endsWith('/usuarios/mi_cuenta'))
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
      .expectOne((peticion) => peticion.url.endsWith('/usuarios/mi_cuenta'))
      .flush({ nombre: 'Ana', apellido: 'Pérez' });
    await fixture.whenStable();

    const enlace = elemento(fixture).querySelector('nav > a') as HTMLAnchorElement;
    expect(enlace.textContent?.trim()).toBe('Mis alojamientos');
    expect(enlace.getAttribute('href')).toBe('/alojamientos');
    const reservas = elemento(fixture).querySelector('nav > a.opcional') as HTMLAnchorElement;
    expect(reservas.textContent?.trim()).toBe('Reservas');
    expect(reservas.getAttribute('href')).toBe('/reservas/alojamientos');
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
      .expectOne((peticion) => peticion.url.endsWith('/usuarios/mi_cuenta'))
      .flush({ nombre: 'Ana', apellido: 'Pérez' });
    await fixture.whenStable();

    const enlace = elemento(fixture).querySelector('nav > a') as HTMLAnchorElement;
    expect(enlace.textContent?.trim()).toBe('Alojamientos');
    expect(enlace.getAttribute('href')).toBe('/publicaciones');
    const reservas = elemento(fixture).querySelector('nav > a.opcional') as HTMLAnchorElement;
    expect(reservas.textContent?.trim()).toBe('Mis reservas');
    expect(reservas.getAttribute('href')).toBe('/reservas');
  });

  it('al administrador la barra le lleva a la administración', async () => {
    TestBed.inject(SesionService).iniciar(
      crearToken({
        sub: 'admin@correo.com',
        role: 'ADMINISTRADOR',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne((peticion) => peticion.url.endsWith('/usuarios/mi_cuenta'))
      .flush({ nombre: 'Admin', apellido: 'SAV' });
    await fixture.whenStable();

    const enlaces = [...elemento(fixture).querySelectorAll<HTMLAnchorElement>('nav > a')];
    expect(enlaces.map((enlace) => enlace.getAttribute('href'))).toEqual([
      '/administracion',
      '/publicaciones',
    ]);
    expect(enlaces[0].textContent?.trim()).toBe('Administración');
    expect(enlaces[1].classList).toContain('opcional');
    expect(elemento(fixture).textContent).not.toContain('Mis reservas');
  });

  it('con sesión muestra la campana con las notificaciones nuevas', async () => {
    TestBed.inject(SesionService).iniciar(
      crearToken({
        sub: 'ana@correo.com',
        role: 'HUESPED',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const backend = TestBed.inject(HttpTestingController);
    backend
      .expectOne((peticion) => peticion.url.endsWith('/usuarios/mi_cuenta'))
      .flush({ nombre: 'Ana', apellido: 'Pérez' });
    await new Promise((resolver) => setTimeout(resolver));
    backend
      .expectOne((peticion) => peticion.url.endsWith('/notificaciones/mis-notificaciones'))
      .flush([
        {
          idNotificacion: 'n-1',
          idUsuario: 'u-1',
          idReserva: 'r-1',
          idPublicacion: null,
          tipo: 'RESERVA_ESTADO_CAMBIADO',
          mensaje: 'Tu reserva cambió de estado.',
          fechaCreacion: new Date().toISOString(),
          fechaLectura: null,
        },
      ]);
    await fixture.whenStable();

    const campana = elemento(fixture).querySelector('app-campana-notificaciones a') as HTMLElement;
    expect(campana.getAttribute('href')).toBe('/notificaciones');
    expect(campana.getAttribute('aria-label')).toBe('Notificaciones, 1 nueva');
    expect(campana.querySelector('.contador')?.textContent?.trim()).toBe('1');
  });

  it('sin sesión no muestra la campana', async () => {
    const fixture = await crear();
    expect(elemento(fixture).querySelector('app-campana-notificaciones')).toBeNull();
  });
});
