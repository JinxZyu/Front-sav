import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Rol } from '../../../config/auth/sesion.models';
import { SesionService } from '../../../config/auth/sesion.service';
import { crearToken } from '../../../config/auth/sesion.testing';
import { environment } from '../../../../environments/environment';
import { DesactivarCuenta } from './desactivar-cuenta';

describe('DesactivarCuenta (HU-008)', () => {
  let fixture: ComponentFixture<DesactivarCuenta>;
  let componente: DesactivarCuenta;
  let backend: HttpTestingController;
  let sesion: SesionService;
  const url = `${environment.apiUrl}/usuarios/mi_cuenta/desactivar`;
  const urlCuenta = `${environment.apiUrl}/usuarios/mi_cuenta`;

  const crear = async (rol: Rol = 'HUESPED') => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    sesion = TestBed.inject(SesionService);
    sesion.iniciar(
      crearToken({ sub: 'a@b.co', role: rol, exp: Math.floor(Date.now() / 1000) + 3600 }),
    );
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DesactivarCuenta);
    componente = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    TestBed.tick();
    for (const pendiente of backend.match(urlCuenta)) {
      pendiente.flush({ nombre: 'Ana', apellido: 'Pérez' });
    }
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const boton = (texto: string) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('button')].find((opcion) =>
      opcion.textContent?.includes(texto),
    );

  afterEach(() => {
    backend.verify();
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('pide confirmar antes de desactivar y mueve el foco a la confirmación', async () => {
    await crear();
    expect(elemento().querySelector('.confirmacion')).toBeNull();

    boton('Desactivar cuenta')?.click();
    await fixture.whenStable();

    const panel = elemento().querySelector<HTMLElement>('.confirmacion');
    expect(panel?.textContent).toContain('¿Seguro que quieres desactivar tu cuenta?');
    expect(document.activeElement).toBe(panel);
    backend.expectNone(url);
  });

  it('criterio 1: al anfitrión le avisa que se pausan sus publicaciones y se conservan sus reservas', async () => {
    await crear('ANFITRION');
    componente.abrir();
    await fixture.whenStable();
    expect(elemento().textContent).toContain('Tus publicaciones se pausarán');
  });

  it('al huésped no le muestra el aviso de publicaciones', async () => {
    await crear('HUESPED');
    componente.abrir();
    await fixture.whenStable();
    expect(elemento().textContent).not.toContain('publicaciones');
  });

  it('criterio 1: desactiva la cuenta, cierra la sesión y lleva al inicio de sesión con un aviso', async () => {
    await crear();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    componente.abrir();
    await fixture.whenStable();

    boton('Sí, desactivar mi cuenta')?.click();
    const peticion = backend.expectOne(url);
    expect(peticion.request.method).toBe('PATCH');
    peticion.flush('Tu cuenta ha sido desactivada correctamente.');

    expect(sesion.autenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/usuario/login'], {
      queryParams: { aviso: 'cuenta-desactivada' },
    });
  });

  it('cierra la sesión aunque se salga de la pantalla antes de la respuesta', async () => {
    await crear();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    componente.abrir();
    componente.desactivar();
    const peticion = backend.expectOne(url);

    fixture.destroy();
    expect(peticion.cancelled).toBe(false);
    peticion.flush('Tu cuenta ha sido desactivada correctamente.');

    expect(sesion.autenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/usuario/login'], {
      queryParams: { aviso: 'cuenta-desactivada' },
    });
  });

  it('no cierra otra sesión iniciada mientras esperaba la respuesta', async () => {
    await crear();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    componente.desactivar();
    const peticion = backend.expectOne(url);

    fixture.destroy();
    sesion.cerrar();
    const otraSesion = crearToken({
      sub: 'otra@b.co',
      role: 'HUESPED',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    sesion.iniciar(otraSesion);
    peticion.flush('Tu cuenta ha sido desactivada correctamente.');

    expect(sesion.token()).toBe(otraSesion);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('tampoco navega si la sesión ya se había cerrado', async () => {
    await crear();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    componente.desactivar();
    const peticion = backend.expectOne(url);

    sesion.cerrar();
    peticion.flush('Tu cuenta ha sido desactivada correctamente.');

    expect(navegar).not.toHaveBeenCalled();
  });

  it('criterios 3 y 4: informa si la cuenta tiene una restricción y la deja como estaba', async () => {
    await crear();
    componente.abrir();
    componente.desactivar();
    backend
      .expectOne(url)
      .flush('No puedes desactivar una cuenta con restricción administrativa.', {
        status: 409,
        statusText: 'Conflict',
      });
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toBe(
      'No puedes desactivar una cuenta con restricción administrativa.',
    );
    expect(componente.confirmando()).toBe(true);
    expect(sesion.autenticado()).toBe(true);
  });

  it('ignora un segundo clic y no deja cancelar mientras desactiva', async () => {
    await crear();
    componente.abrir();
    componente.desactivar();
    componente.desactivar();
    componente.cancelar();

    expect(componente.confirmando()).toBe(true);
    await fixture.whenStable();
    expect(boton('Desactivando…')?.disabled).toBe(true);
    expect(boton('Cancelar')?.disabled).toBe(true);
    backend.expectOne(url).flush('Error', { status: 500, statusText: 'Error' });
  });

  it('cancelar cierra la confirmación y devuelve el foco al botón', async () => {
    await crear();
    componente.abrir();
    await fixture.whenStable();

    boton('Cancelar')?.click();
    await fixture.whenStable();

    expect(componente.confirmando()).toBe(false);
    expect(document.activeElement).toBe(boton('Desactivar cuenta'));
  });
});
