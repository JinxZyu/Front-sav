import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { TarifasPublicacion } from './tarifas-publicacion';

describe('TarifasPublicacion (HU-020)', () => {
  let fixture: ComponentFixture<TarifasPublicacion>;
  let componente: TarifasPublicacion;
  let backend: HttpTestingController;
  let guardados: number;
  const url = `${environment.apiUrl}/publicaciones/p-1/configuracion-comercial`;

  const configuracion = (cambios: object = {}) => ({
    idPublicacion: 'p-1',
    tarifaLimpieza: 30000,
    serviciosAdicionales: [
      {
        idAdicional: 'a-1',
        nombre: 'Desayuno',
        descripcion: 'Para dos',
        costo: 20000,
        activo: true,
      },
      { idAdicional: 'a-2', nombre: 'Traslado', descripcion: null, costo: 50000, activo: false },
    ],
    fechaActualizacion: null,
    ...cambios,
  });

  const crear = async (respuesta: object | null = configuracion(), editable = true) => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TarifasPublicacion);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('idPublicacion', 'p-1');
    fixture.componentRef.setInput('editable', editable);
    guardados = 0;
    componente.guardado.subscribe(() => guardados++);
    fixture.detectChanges();
    TestBed.tick();
    if (respuesta) {
      backend.expectOne(url).flush(respuesta);
      await fixture.whenStable();
    }
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const botonPorTexto = (texto: string) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('button')].find(
      (boton) => boton.textContent?.trim() === texto,
    );
  const escribir = (campo: HTMLInputElement | null | undefined, valor: string) => {
    if (campo) {
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
    }
  };

  afterEach(() => backend.verify());

  it('muestra la tarifa de limpieza y solo los servicios activos', async () => {
    await crear();

    const texto = elemento().textContent ?? '';
    expect(elemento().querySelector('.valor')?.textContent).toContain('30.000');
    expect(texto).toContain('Desayuno');
    expect(texto).toContain('Para dos');
    expect(texto).not.toContain('Traslado');
  });

  it('criterios 1 a 3: actualiza la tarifa y los servicios adicionales', async () => {
    await crear();
    botonPorTexto('Cambiar')?.click();
    await fixture.whenStable();

    expect(componente.filas.length).toBe(1);
    escribir(
      elemento().querySelector<HTMLInputElement>('input[formControlName="tarifaLimpieza"]'),
      '35000',
    );
    botonPorTexto('Agregar servicio')?.click();
    await fixture.whenStable();
    const filas = elemento().querySelectorAll('.fila');
    escribir(
      filas[1].querySelector<HTMLInputElement>('input[formControlName="nombre"]'),
      ' Mascotas ',
    );
    escribir(filas[1].querySelector<HTMLInputElement>('input[formControlName="costo"]'), '15000');
    botonPorTexto('Guardar')?.click();

    const peticion = backend.expectOne(url);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({
      tarifaLimpieza: 35000,
      serviciosAdicionales: [
        { nombre: 'Desayuno', descripcion: 'Para dos', costo: 20000 },
        { nombre: 'Mascotas', descripcion: null, costo: 15000 },
      ],
    });
    peticion.flush(
      configuracion({
        tarifaLimpieza: 35000,
        serviciosAdicionales: [
          {
            idAdicional: 'a-1',
            nombre: 'Desayuno',
            descripcion: 'Para dos',
            costo: 20000,
            activo: true,
          },
          { idAdicional: 'a-3', nombre: 'Mascotas', descripcion: null, costo: 15000, activo: true },
        ],
      }),
    );
    await fixture.whenStable();

    expect(elemento().querySelector('form')).toBeNull();
    expect(elemento().textContent).toContain('Mascotas');
    expect(elemento().querySelector('[role="status"]')?.textContent).toContain('Guardamos');
    expect(guardados).toBe(1);
  });

  it('permite quitar todos los servicios', async () => {
    await crear();
    botonPorTexto('Cambiar')?.click();
    await fixture.whenStable();
    elemento().querySelector<HTMLButtonElement>('.quitar')?.click();
    await fixture.whenStable();

    expect(elemento().textContent).toContain('No ofreces servicios adicionales.');
    botonPorTexto('Guardar')?.click();
    const peticion = backend.expectOne(url);
    expect(peticion.request.body.serviciosAdicionales).toEqual([]);
    peticion.flush(configuracion({ serviciosAdicionales: [] }));
  });

  it('no guarda valores inválidos ni nombres repetidos', async () => {
    await crear();
    botonPorTexto('Cambiar')?.click();
    await fixture.whenStable();
    componente.formulario.controls.tarifaLimpieza.setValue('-5');
    componente.agregar();
    componente.filas.at(1).patchValue({ nombre: 'desayuno', costo: '1.5' });
    botonPorTexto('Guardar')?.click();
    await fixture.whenStable();

    backend.expectNone(url);
    expect(elemento().querySelector('#error-tarifa')).not.toBeNull();
    expect(elemento().querySelector('#error-costo-1')).not.toBeNull();
    expect(elemento().textContent).toContain('Hay servicios con el mismo nombre.');
    expect(
      elemento()
        .querySelector('input[formControlName="tarifaLimpieza"]')
        ?.getAttribute('aria-invalid'),
    ).toBe('true');
  });

  it('criterio 4: muestra el rechazo del servidor y conserva lo escrito', async () => {
    await crear();
    botonPorTexto('Cambiar')?.click();
    await fixture.whenStable();
    botonPorTexto('Guardar')?.click();
    backend
      .expectOne(url)
      .flush(
        { mensaje: 'No tienes permisos para modificar esta publicación.' },
        { status: 403, statusText: 'Forbidden' },
      );
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('No tienes permisos');
    expect(elemento().querySelector('form')).not.toBeNull();
    expect(guardados).toBe(0);
  });

  it('no permite más de 20 servicios', async () => {
    await crear(configuracion({ serviciosAdicionales: [] }));
    componente.cambiar();
    for (let vez = 0; vez < 25; vez++) {
      componente.agregar();
    }
    await fixture.whenStable();

    expect(componente.filas.length).toBe(20);
    expect(botonPorTexto('Agregar servicio')).toBeUndefined();
  });

  it('cancelar descarta los cambios', async () => {
    await crear();
    componente.cambiar();
    componente.formulario.controls.tarifaLimpieza.setValue('1');
    componente.cancelar();
    await fixture.whenStable();

    expect(elemento().querySelector('.valor')?.textContent).toContain('30.000');
  });

  it('permite reintentar si falla la consulta y no ofrece cambiar si no es editable', async () => {
    await crear(null, false);
    backend.expectOne(url).flush('Error', { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    botonPorTexto('Reintentar')?.click();
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(url).flush(configuracion());
    await fixture.whenStable();

    expect(elemento().textContent).toContain('Desayuno');
    expect(botonPorTexto('Cambiar')).toBeUndefined();
  });
});
