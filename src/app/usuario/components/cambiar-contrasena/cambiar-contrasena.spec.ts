import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AvisosService } from '../../../shared/services/avisos.service';
import { CambiarContrasena } from './cambiar-contrasena';

describe('CambiarContrasena (HU-007)', () => {
  let fixture: ComponentFixture<CambiarContrasena>;
  let componente: CambiarContrasena;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/usuarios/mi_cuenta/contrasena`;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CambiarContrasena);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  const elemento = () => fixture.nativeElement as HTMLElement;
  const llenar = (actual = 'clave-actual', nueva = 'clave-nueva-1', confirmacion = nueva) =>
    componente.formulario.setValue({
      contrasenaActual: actual,
      nuevaContrasena: nueva,
      confirmacion,
    });

  it('muestra la contraseña oculta y abre el formulario', async () => {
    expect(elemento().textContent).toContain('••••••••');
    expect(elemento().querySelector('form')).toBeNull();

    elemento().querySelector<HTMLButtonElement>('button.secundario')?.click();
    await fixture.whenStable();

    expect(elemento().querySelectorAll('app-campo-contrasena')).toHaveLength(3);
  });

  it('criterio 2: actualiza la contraseña con la actual y la nueva', async () => {
    componente.abrir();
    llenar();
    componente.guardar();

    const peticion = backend.expectOne(url);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({
      contrasenaActual: 'clave-actual',
      nuevaContrasena: 'clave-nueva-1',
    });
    peticion.flush('La contraseña se actualizó correctamente.');
    await fixture.whenStable();

    expect(componente.abierto()).toBe(false);
    expect(elemento().querySelector('[role="status"]')).toBeNull();
    expect(TestBed.inject(AvisosService).avisos()).toEqual([
      expect.objectContaining({
        titulo: 'Contraseña actualizada',
        detalle: 'La contraseña se actualizó correctamente.',
      }),
    ]);
  });

  it('usa un aviso por defecto si el backend no manda texto', () => {
    componente.abrir();
    llenar();
    componente.guardar();
    backend.expectOne(url).flush('');
    expect(TestBed.inject(AvisosService).avisos()[0].detalle).toBe(
      'La contraseña se actualizó correctamente.',
    );
  });

  it('criterio 3: exige mínimo 8 caracteres y que la confirmación coincida', async () => {
    componente.abrir();
    llenar('clave-actual', 'corta', 'otra');
    componente.guardar();
    await fixture.whenStable();

    backend.expectNone(url);
    expect(componente.noCoinciden()).toBe(true);
    expect(elemento().textContent).toContain('Debe tener al menos 8 caracteres.');
    expect(elemento().textContent).toContain('Las contraseñas no coinciden.');
  });

  it('criterio 3: informa si la contraseña actual es incorrecta y mantiene el formulario', async () => {
    componente.abrir();
    llenar();
    componente.guardar();
    backend
      .expectOne(url)
      .flush('La contraseña actual es incorrecta.', { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(componente.abierto()).toBe(true);
    expect(elemento().querySelector('[role="alert"]')?.textContent).toBe(
      'La contraseña actual es incorrecta.',
    );
  });

  it('ignora envíos repetidos y no deja cancelar mientras guarda', () => {
    componente.abrir();
    llenar();
    componente.guardar();
    componente.guardar();
    componente.cancelar();
    expect(componente.abierto()).toBe(true);
    backend.expectOne(url).flush('');
  });

  it('cancelar cierra el formulario', () => {
    componente.abrir();
    componente.cancelar();
    expect(componente.abierto()).toBe(false);
  });
});
