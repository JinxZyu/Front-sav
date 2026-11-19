import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Rol } from '../../../config/auth/sesion.models';
import { SesionService } from '../../../config/auth/sesion.service';
import { crearToken } from '../../../config/auth/sesion.testing';
import { environment } from '../../../../environments/environment';
import { MenuUsuario } from './menu-usuario';

describe('MenuUsuario (HU-004)', () => {
  let fixture: ComponentFixture<MenuUsuario>;
  let componente: MenuUsuario;
  let backend: HttpTestingController;
  const urlCuenta = `${environment.apiUrl}/usuarios/mi_cuenta`;

  const crear = async (rol: Rol = 'ANFITRION') => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(SesionService).iniciar(
      crearToken({
        sub: 'sophie@correo.com',
        role: rol,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MenuUsuario);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  };

  const responderCuenta = async (nombre = 'Sophia', apellido = 'Mora') => {
    backend.expectOne(urlCuenta).flush({ nombre, apellido, correo: 'sophie@correo.com' });
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const disparador = () => elemento().querySelector<HTMLButtonElement>('.disparador');

  afterEach(() => backend.verify());

  it('muestra las iniciales y el primer nombre de la cuenta', async () => {
    await crear();
    await responderCuenta();

    expect(elemento().querySelector('.avatar')?.textContent?.trim()).toBe('SM');
    expect(elemento().querySelector('.nombre-corto')?.textContent?.trim()).toBe('Sophia');
    expect(disparador()?.getAttribute('aria-label')).toBe('Menú de Sophia Mora');
  });

  it('no muestra el correo mientras cargan los datos de la cuenta', async () => {
    await crear();

    expect(componente.cargando()).toBe(true);
    expect(componente.nombre()).toBe('');
    expect(componente.iniciales()).toBe('');
    expect(elemento().querySelector('.nombre-corto.vacio')).not.toBeNull();
    expect(elemento().textContent).not.toContain('sophie');
    expect(disparador()?.getAttribute('aria-label')).toBe('Menú de usuario');
    expect(disparador()?.getAttribute('aria-busy')).toBe('true');

    await responderCuenta();
    expect(componente.cargando()).toBe(false);
    expect(elemento().querySelector('.nombre-corto')?.textContent?.trim()).toBe('Sophia');
  });

  it('usa el correo solo si no se pudieron cargar los datos', async () => {
    await crear();
    backend.expectOne(urlCuenta).flush('Error', { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(componente.cargando()).toBe(false);
    expect(componente.nombre()).toBe('sophie@correo.com');
    expect(componente.primerNombre()).toBe('sophie');
    expect(componente.iniciales()).toBe('S');
  });

  it('abre el menú con el nombre, el correo y el rol', async () => {
    await crear('ADMINISTRADOR');
    await responderCuenta();

    expect(elemento().querySelector('[role="menu"]')).toBeNull();
    disparador()?.click();
    await fixture.whenStable();

    expect(disparador()?.getAttribute('aria-expanded')).toBe('true');
    const panel = elemento().querySelector('[role="menu"]');
    expect(panel?.querySelector('.nombre')?.textContent).toBe('Sophia Mora');
    expect(panel?.querySelector('.correo')?.textContent).toBe('sophie@correo.com');
    expect(panel?.querySelector('.rol')?.textContent).toBe('Administrador');
  });

  it('se cierra al hacer clic afuera o con Escape', async () => {
    await crear();
    await responderCuenta();

    componente.alternar();
    componente.cerrarSiEsAfuera(new MouseEvent('click'));
    expect(componente.abierto()).toBe(false);

    componente.alternar();
    componente.cerrarSiEsAfuera({ target: disparador() } as unknown as Event);
    expect(componente.abierto()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(componente.abierto()).toBe(false);
  });

  it('con Escape cierra el menú y devuelve el foco al botón que lo abrió', async () => {
    await crear();
    await responderCuenta();
    document.body.appendChild(fixture.nativeElement);

    disparador()?.click();
    await fixture.whenStable();
    elemento().querySelector<HTMLButtonElement>('.salir')?.focus();
    expect(document.activeElement?.classList.contains('salir')).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();

    expect(componente.abierto()).toBe(false);
    expect(document.activeElement).toBe(disparador());
    fixture.nativeElement.remove();
  });

  it('con Escape no mueve el foco si estaba fuera del menú', async () => {
    await crear();
    await responderCuenta();
    const otro = document.createElement('button');
    document.body.appendChild(otro);

    componente.alternar();
    otro.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(componente.abierto()).toBe(false);
    expect(document.activeElement).toBe(otro);
    otro.remove();
  });

  it('Escape no hace nada si el menú está cerrado', async () => {
    await crear();
    await responderCuenta();
    const enfocar = vi.spyOn(disparador() as HTMLButtonElement, 'focus');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(enfocar).not.toHaveBeenCalled();
  });

  it('ofrece ir a Mi cuenta y cierra el menú al elegirlo', async () => {
    await crear();
    await responderCuenta();
    disparador()?.click();
    await fixture.whenStable();

    const enlace = elemento().querySelector<HTMLAnchorElement>('a.opcion');
    expect(enlace?.textContent?.trim()).toBe('Mi cuenta');
    expect(enlace?.getAttribute('href')).toBe('/usuario/mi-cuenta');

    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    enlace?.click();
    expect(componente.abierto()).toBe(false);
    expect(navegar).toHaveBeenCalled();
  });

  it('cierra la sesión y lleva al inicio de sesión', async () => {
    await crear();
    await responderCuenta();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    disparador()?.click();
    await fixture.whenStable();
    elemento().querySelector<HTMLButtonElement>('.salir')?.click();

    expect(TestBed.inject(SesionService).autenticado()).toBe(false);
    expect(componente.abierto()).toBe(false);
    expect(navegar).toHaveBeenCalledWith('/usuario/login');
  });

  it('no muestra rol si la sesión no tiene uno válido', async () => {
    await crear();
    await responderCuenta();
    vi.spyOn(TestBed.inject(SesionService), 'rol').mockReturnValue(null);
    expect(componente.nombreRol()).toBe('');
  });
});
