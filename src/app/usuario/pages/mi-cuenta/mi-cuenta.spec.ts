import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SesionService } from '../../../config/auth/sesion.service';
import { crearToken } from '../../../config/auth/sesion.testing';
import { environment } from '../../../../environments/environment';
import { Cuenta } from '../../models/usuario.models';
import { MiCuenta } from './mi-cuenta';
import { AvisosService } from '../../../shared/services/avisos.service';

describe('MiCuenta (HU-006)', () => {
  let fixture: ComponentFixture<MiCuenta>;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/usuarios/mi_cuenta`;

  const cuenta: Cuenta = {
    nombre: 'Sophia',
    apellido: 'Mora',
    correo: 'sophie@correo.com',
    tipoDocumento: 'CC',
    documentoIdentidad: '1012345678',
    rol: 'ANFITRION',
  };

  const crear = () => {
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
    fixture = TestBed.createComponent(MiCuenta);
    fixture.detectChanges();
  };

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const valor = (etiqueta: string) => {
    const filas = [...(fixture.nativeElement as HTMLElement).querySelectorAll('dl > div')];
    return filas
      .find((fila) => fila.querySelector('dt')?.textContent === etiqueta)
      ?.querySelector('dd')
      ?.textContent?.trim();
  };

  afterEach(() => backend.verify());

  it('muestra un estado de carga mientras llegan los datos', () => {
    crear();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')).not.toBeNull();
    backend.expectOne(url).flush(cuenta);
  });

  it('criterio 1: muestra nombre, correo, documento de identidad y rol de la propia cuenta', async () => {
    crear();
    backend.expectOne(url).flush(cuenta);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe(
      'Sophia Mora',
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.avatar')?.textContent?.trim(),
    ).toBe('SM');
    expect(texto()).toContain('Anfitrión');
    expect(valor('Nombre')).toBe('Sophia');
    expect(valor('Apellido')).toBe('Mora');
    expect(valor('Correo electrónico')).toBe('sophie@correo.com');
    expect(valor('Tipo de documento')).toBe('Cédula de ciudadanía');
    expect(valor('Número de documento')).toBe('1012345678');
  });

  it('muestra los datos aunque el documento no esté disponible', async () => {
    crear();
    backend.expectOne(url).flush({ ...cuenta, documentoIdentidad: null });
    await fixture.whenStable();

    expect(valor('Nombre')).toBe('Sophia');
    expect(valor('Número de documento')).toBe(
      'No disponible. Pide a un administrador que lo corrija.',
    );
  });

  it('muestra el tipo de documento y el rol tal cual si no los conoce', async () => {
    crear();
    backend.expectOne(url).flush({ ...cuenta, tipoDocumento: 'NIT', rol: 'OTRO' });
    await fixture.whenStable();

    expect(valor('Tipo de documento')).toBe('NIT');
    expect(texto()).toContain('OTRO');
  });

  it('si falla una recarga muestra el error junto a los datos que ya tenía', async () => {
    crear();
    backend.expectOne(url).flush(cuenta);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    fixture.componentInstance.alGuardar('Perfil actualizado correctamente.');
    TestBed.tick();
    backend
      .expectOne(url)
      .flush({ mensaje: 'Servicio no disponible.' }, { status: 503, statusText: 'Error' });
    await fixture.whenStable();

    expect(elemento.querySelector('h1')?.textContent).toBe('Sophia Mora');
    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'Servicio no disponible.',
    );
    const reintentar = elemento.querySelector<HTMLButtonElement>('.recarga .reintentar');
    expect(reintentar).not.toBeNull();

    reintentar?.click();
    TestBed.tick();
    fixture.detectChanges();
    expect(elemento.querySelector('[role="alert"]')).toBeNull();
    backend.expectOne(url).flush({ ...cuenta, nombre: 'Sofía' });
    await fixture.whenStable();

    expect(elemento.querySelector('h1')?.textContent).toBe('Sofía Mora');
  });

  it('avisa si no se pudieron cargar los datos y permite reintentar', async () => {
    crear();
    backend
      .expectOne(url)
      .flush({ mensaje: 'Usuario no encontrado.' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toBe('Usuario no encontrado.');

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.reintentar')?.click();
    TestBed.tick();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.reintentar')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')).not.toBeNull();

    backend.expectOne(url).flush(cuenta);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe(
      'Sophia Mora',
    );
  });

  it('criterio 1: al editar y guardar vuelve a los datos con el aviso y los recarga', async () => {
    crear();
    backend.expectOne(url).flush(cuenta);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    elemento.querySelector<HTMLButtonElement>('button.editar')?.click();
    await fixture.whenStable();
    expect(elemento.querySelector('app-editar-perfil')).not.toBeNull();
    expect(elemento.querySelector('button.editar')).toBeNull();

    elemento.querySelector<HTMLButtonElement>('app-editar-perfil button[type="submit"]')?.click();
    backend.expectOne(`${url}/perfil`).flush('Perfil actualizado correctamente.');
    TestBed.tick();
    backend.expectOne(url).flush({ ...cuenta, nombre: 'Sofía' });
    await fixture.whenStable();

    expect(elemento.querySelector('app-editar-perfil')).toBeNull();
    expect(TestBed.inject(AvisosService).avisos().at(-1)).toEqual(
      expect.objectContaining({
        titulo: 'Perfil actualizado',
        detalle: 'Perfil actualizado correctamente.',
      }),
    );
    expect(valor('Nombre')).toBe('Sofía');
  });

  it('cancelar la edición vuelve a mostrar los datos', async () => {
    crear();
    backend.expectOne(url).flush(cuenta);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    elemento.querySelector<HTMLButtonElement>('button.editar')?.click();
    await fixture.whenStable();
    elemento.querySelector<HTMLButtonElement>('app-editar-perfil button.secundario')?.click();
    await fixture.whenStable();

    expect(elemento.querySelector('app-editar-perfil')).toBeNull();
    expect(valor('Nombre')).toBe('Sophia');
  });

  it('incluye la sección para cambiar la contraseña', async () => {
    crear();
    backend.expectOne(url).flush(cuenta);
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-cambiar-contrasena'),
    ).not.toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-desactivar-cuenta'),
    ).not.toBeNull();
  });

  it('mantiene el editor si falla la recarga después de pedir el cambio de correo', async () => {
    crear();
    backend.expectOne(url).flush(cuenta);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    elemento.querySelector<HTMLButtonElement>('button.editar')?.click();
    await fixture.whenStable();
    const correo = elemento.querySelector<HTMLInputElement>(
      'app-editar-perfil input[formControlName="correo"]',
    );
    if (correo) {
      correo.value = 'nuevo@correo.com';
      correo.dispatchEvent(new Event('input'));
    }
    elemento.querySelector<HTMLButtonElement>('app-editar-perfil button[type="submit"]')?.click();
    backend.expectOne(`${url}/perfil`).flush('Se envió un código al nuevo correo.');
    TestBed.tick();
    backend.expectOne(url).flush('Error', { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(elemento.querySelector('app-editar-perfil')).not.toBeNull();
    expect(elemento.textContent).toContain('Escribe el código que enviamos a nuevo@correo.com');
    expect(elemento.querySelector('h1')?.textContent).toBe('Sophia Mora');
  });

  it('no deja abrir el editor mientras se recarga la cuenta', async () => {
    crear();
    backend.expectOne(url).flush(cuenta);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    elemento.querySelector<HTMLButtonElement>('button.editar')?.click();
    await fixture.whenStable();
    const nombre = elemento.querySelector<HTMLInputElement>(
      'app-editar-perfil input[formControlName="nombre"]',
    );
    if (nombre) {
      nombre.value = 'Sofía';
      nombre.dispatchEvent(new Event('input'));
    }
    elemento.querySelector<HTMLButtonElement>('app-editar-perfil button[type="submit"]')?.click();
    backend.expectOne(`${url}/perfil`).flush('Perfil actualizado correctamente.');
    TestBed.tick();
    fixture.detectChanges();

    const recarga = backend.expectOne(url);
    const boton = elemento.querySelector<HTMLButtonElement>('button.editar');
    expect(boton?.disabled).toBe(true);
    fixture.componentInstance.editar();
    fixture.detectChanges();
    expect(elemento.querySelector('app-editar-perfil')).toBeNull();

    recarga.flush({ ...cuenta, nombre: 'Sofía' });
    await fixture.whenStable();
    elemento.querySelector<HTMLButtonElement>('button.editar')?.click();
    await fixture.whenStable();

    expect(
      elemento.querySelector<HTMLInputElement>('app-editar-perfil input[formControlName="nombre"]')
        ?.value,
    ).toBe('Sofía');
  });
});
