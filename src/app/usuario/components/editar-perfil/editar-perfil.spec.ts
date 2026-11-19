import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SesionService } from '../../../config/auth/sesion.service';
import { crearToken } from '../../../config/auth/sesion.testing';
import { environment } from '../../../../environments/environment';
import { Cuenta } from '../../models/usuario.models';
import { EditarPerfil } from './editar-perfil';

describe('EditarPerfil (HU-007)', () => {
  let fixture: ComponentFixture<EditarPerfil>;
  let componente: EditarPerfil;
  let backend: HttpTestingController;
  const api = environment.apiUrl;
  const urlPerfil = `${api}/usuarios/mi_cuenta/perfil`;
  const urlConfirmar = `${api}/usuarios/mi_cuenta/correo/confirmar`;
  const urlCuenta = `${api}/usuarios/mi_cuenta`;

  const cuenta: Cuenta = {
    nombre: 'Sophia',
    apellido: 'Mora',
    correo: 'sophie@correo.com',
    tipoDocumento: 'CC',
    documentoIdentidad: '1012345678',
    rol: 'ANFITRION',
  };

  const crear = async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(SesionService).iniciar(
      crearToken({
        sub: cuenta.correo,
        role: 'ANFITRION',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EditarPerfil);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('cuenta', cuenta);
    fixture.detectChanges();
    TestBed.tick();
    for (const pendiente of backend.match(urlCuenta)) {
      pendiente.flush(cuenta);
    }
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const campo = (nombre: string) =>
    elemento().querySelector<HTMLInputElement>(`input[formControlName="${nombre}"]`);

  afterEach(() => backend.verify());

  it('carga los datos actuales en el formulario', async () => {
    await crear();
    expect(componente.formulario.getRawValue()).toEqual({
      nombre: 'Sophia',
      apellido: 'Mora',
      correo: 'sophie@correo.com',
    });
  });

  it('criterio 5: muestra el documento de identidad como un campo no editable', async () => {
    await crear();
    const deshabilitados = [...elemento().querySelectorAll<HTMLInputElement>('input:disabled')];
    expect(deshabilitados.map((entrada) => entrada.value)).toEqual([
      'Cédula de ciudadanía',
      '1012345678',
    ]);
    expect(elemento().textContent).toContain('El documento de identidad no se puede modificar.');

    componente.formulario.controls.nombre.setValue('Sofía');
    componente.guardar();
    const peticion = backend.expectOne(urlPerfil);
    expect(Object.keys(peticion.request.body)).toEqual(['nombre', 'apellido', 'correo']);
    peticion.flush('Perfil actualizado correctamente.');
  });

  it('criterio 1: guarda nombre y apellido y avisa con el mensaje del backend', async () => {
    await crear();
    const guardado = vi.fn();
    componente.guardado.subscribe(guardado);
    componente.formulario.patchValue({ nombre: '  Sofía ', apellido: 'Mora Díaz' });

    componente.guardar();
    const peticion = backend.expectOne(urlPerfil);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({
      nombre: 'Sofía',
      apellido: 'Mora Díaz',
      correo: 'sophie@correo.com',
    });
    peticion.flush('Perfil actualizado correctamente.');

    expect(guardado).toHaveBeenCalledWith('Perfil actualizado correctamente.');
  });

  it('usa un mensaje por defecto si el backend no manda texto', async () => {
    await crear();
    const guardado = vi.fn();
    componente.guardado.subscribe(guardado);
    componente.guardar();
    backend.expectOne(urlPerfil).flush('');
    expect(guardado).toHaveBeenCalledWith('Perfil actualizado correctamente.');
  });

  it('criterio 3: no envía datos inválidos y los marca', async () => {
    await crear();
    componente.formulario.patchValue({ nombre: '   ', correo: 'no-es-correo' });
    componente.guardar();
    await fixture.whenStable();

    backend.expectNone(urlPerfil);
    expect(campo('nombre')?.getAttribute('aria-invalid')).toBe('true');
    expect(campo('correo')?.getAttribute('aria-invalid')).toBe('true');
    expect(elemento().textContent).toContain('Ingresa un correo válido.');
  });

  it('criterio 3: informa el error del backend y conserva lo escrito', async () => {
    await crear();
    const guardado = vi.fn();
    componente.guardado.subscribe(guardado);
    componente.formulario.patchValue({ nombre: 'Sofía' });

    componente.guardar();
    backend
      .expectOne(urlPerfil)
      .flush('Debes proporcionar todos los datos del perfil.', {
        status: 400,
        statusText: 'Bad Request',
      });
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toBe(
      'Debes proporcionar todos los datos del perfil.',
    );
    expect(componente.formulario.controls.nombre.value).toBe('Sofía');
    expect(guardado).not.toHaveBeenCalled();
  });

  it('criterio 6: avisa que el correo ya está asociado a otra cuenta', async () => {
    await crear();
    componente.formulario.patchValue({ correo: 'otra@correo.com' });
    componente.guardar();
    backend.expectOne(urlPerfil).flush('El correo electrónico ya está asociado a otra cuenta.', {
      status: 409,
      statusText: 'Conflict',
    });
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toBe(
      'El correo electrónico ya está asociado a otra cuenta.',
    );
    expect(componente.paso()).toBe('datos');
  });

  it('al cambiar el correo pide el código enviado al nuevo correo', async () => {
    await crear();
    componente.formulario.patchValue({ correo: 'Nuevo@Correo.com' });
    componente.guardar();
    const peticion = backend.expectOne(urlPerfil);
    expect(peticion.request.body.correo).toBe('nuevo@correo.com');
    peticion.flush(
      'Perfil actualizado. Se envió un código al nuevo correo para confirmar el cambio.',
    );
    TestBed.tick();
    backend.expectOne(urlCuenta).flush(cuenta);
    await fixture.whenStable();

    expect(componente.paso()).toBe('codigo');
    expect(elemento().textContent).toContain('nuevo@correo.com');
    expect(elemento().querySelector('[role="status"]')?.textContent).toContain(
      'Se envió un código',
    );
  });

  it('confirma el nuevo correo, cierra la sesión y lleva al inicio de sesión', async () => {
    await crear();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    componente.formulario.patchValue({ correo: 'nuevo@correo.com' });
    componente.guardar();
    backend.expectOne(urlPerfil).flush('');
    TestBed.tick();
    backend.expectOne(urlCuenta).flush(cuenta);
    expect(componente.aviso()).toBe('Te enviamos un código al nuevo correo.');

    componente.formularioCodigo.controls.codigo.setValue('123456');
    componente.confirmarCorreo();
    const peticion = backend.expectOne(urlConfirmar);
    expect(peticion.request.body).toEqual({ codigo: '123456' });
    peticion.flush('El correo electrónico se actualizó y verificó correctamente.');

    expect(TestBed.inject(SesionService).autenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/usuario/login'], {
      queryParams: { correo: 'nuevo@correo.com', aviso: 'correo-actualizado' },
    });
  });

  it('no envía un código que no tenga 6 números', async () => {
    await crear();
    componente.paso.set('codigo');
    componente.formularioCodigo.controls.codigo.setValue('12');
    componente.confirmarCorreo();
    backend.expectNone(urlConfirmar);
    expect(componente.formularioCodigo.controls.codigo.touched).toBe(true);
  });

  it('informa si el código es incorrecto', async () => {
    await crear();
    componente.paso.set('codigo');
    componente.formularioCodigo.controls.codigo.setValue('000000');
    componente.confirmarCorreo();
    backend
      .expectOne(urlConfirmar)
      .flush('El código de verificación es incorrecto.', {
        status: 400,
        statusText: 'Bad Request',
      });

    expect(componente.error()).toBe('El código de verificación es incorrecto.');
    expect(TestBed.inject(SesionService).autenticado()).toBe(true);
  });

  it('ignora envíos repetidos mientras guarda', async () => {
    await crear();
    componente.guardar();
    componente.guardar();
    componente.paso.set('codigo');
    componente.formularioCodigo.controls.codigo.setValue('123456');
    componente.confirmarCorreo();
    backend.expectOne(urlPerfil).flush('Perfil actualizado correctamente.');
    backend.expectNone(urlConfirmar);
  });

  it('permite cancelar, salvo mientras guarda', async () => {
    await crear();
    const cancelado = vi.fn();
    componente.cancelado.subscribe(cancelado);

    componente.guardar();
    componente.cancelar();
    expect(cancelado).not.toHaveBeenCalled();
    backend.expectOne(urlPerfil).flush('Perfil actualizado correctamente.');

    componente.cancelar();
    expect(cancelado).toHaveBeenCalledTimes(1);
  });
});
