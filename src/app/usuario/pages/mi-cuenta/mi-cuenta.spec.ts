import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SesionService } from '../../../config/auth/sesion.service';
import { crearToken } from '../../../config/auth/sesion.testing';
import { environment } from '../../../../environments/environment';
import { Cuenta } from '../../models/usuario.models';
import { MiCuenta } from './mi-cuenta';

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
      ?.querySelector('dd')?.textContent;
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

  it('muestra el tipo de documento y el rol tal cual si no los conoce', async () => {
    crear();
    backend.expectOne(url).flush({ ...cuenta, tipoDocumento: 'NIT', rol: 'OTRO' });
    await fixture.whenStable();

    expect(valor('Tipo de documento')).toBe('NIT');
    expect(texto()).toContain('OTRO');
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
    backend.expectOne(url).flush(cuenta);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe(
      'Sophia Mora',
    );
  });
});
