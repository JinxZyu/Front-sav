import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { comoDia } from '../../utils/fechas';
import { DisponibilidadAlojamiento } from './disponibilidad-alojamiento';

describe('DisponibilidadAlojamiento (HU-022 y HU-023)', () => {
  let fixture: ComponentFixture<DisponibilidadAlojamiento>;
  let componente: DisponibilidadAlojamiento;
  let backend: HttpTestingController;
  const api = environment.apiUrl;
  const urlDetalle = `${api}/publicaciones/mis-publicaciones/p-1`;
  const urlPeriodos = `${api}/alojamientos/a-1/periodos-disponibles`;

  const enDias = (dias: number) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return comoDia(fecha);
  };

  const periodo = (cambios: object = {}) => ({
    idPeriodo: 'pe-1',
    idAlojamiento: 'a-1',
    fechaInicio: '2027-01-10',
    fechaFin: '2027-01-15',
    habilitado: true,
    fechaCreacion: null,
    ...cambios,
  });

  const crear = async (periodos: object[] | null = [periodo()]) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ idPublicacion: 'p-1' })) },
        },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DisponibilidadAlojamiento);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.tick();
    backend
      .expectOne(urlDetalle)
      .flush({ idPublicacion: 'p-1', idAlojamiento: 'a-1', titulo: 'Cabaña' });
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
    TestBed.tick();
    if (periodos) {
      backend.expectOne(urlPeriodos).flush(periodos);
      await responderCalendario(periodos);
    }
  };

  const responderCalendario = async (periodos: object[] = []) => {
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
    TestBed.tick();
    backend
      .expectOne(`${api}/alojamientos/a-1/calendario`)
      .flush({ idAlojamiento: 'a-1', periodos, nochesOcupadas: [] });
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const botonPorTexto = (texto: string) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('button')].find(
      (boton) => boton.textContent?.trim() === texto,
    );
  const escribir = (selector: string, valor: string, raiz: ParentNode = elemento()) => {
    const campo = raiz.querySelector<HTMLInputElement>(selector);
    if (campo) {
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
    }
  };

  afterEach(() => backend.verify());

  it('muestra los periodos del alojamiento ordenados y con sus noches', async () => {
    await crear([
      periodo({ idPeriodo: 'pe-2', fechaInicio: '2027-02-01', fechaFin: '2027-02-02' }),
      periodo(),
      periodo({
        idPeriodo: 'pe-3',
        fechaInicio: '2027-03-01',
        fechaFin: '2027-03-04',
        habilitado: false,
      }),
    ]);

    expect(elemento().querySelector('.subtitulo')?.textContent).toBe('Cabaña');
    const items = [...elemento().querySelectorAll('.periodos li')];
    expect(
      items.map((item) => item.querySelector('.nota')?.textContent?.replaceAll(/\s+/g, ' ').trim()),
    ).toEqual(['5 noches · Habilitado', '1 noche · Habilitado', '3 noches · Deshabilitado']);
    expect(items[2].classList).toContain('apagado');
    expect(items[2].querySelector('button')).toBeNull();
  });

  it('criterio 1: registra un periodo con fechas válidas', async () => {
    await crear([]);
    expect(elemento().textContent).toContain('Aún no tienes periodos disponibles');
    escribir('form.tarjeta input[formControlName="fechaInicio"]', enDias(1));
    escribir('form.tarjeta input[formControlName="fechaFin"]', enDias(4));
    botonPorTexto('Agregar periodo')?.click();

    const peticion = backend.expectOne(urlPeriodos);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ fechaInicio: enDias(1), fechaFin: enDias(4) });
    peticion.flush(periodo({ idPeriodo: 'nuevo', fechaInicio: enDias(1), fechaFin: enDias(4) }));
    await responderCalendario();

    expect(elemento().querySelectorAll('.periodos li.tarjeta')).toHaveLength(1);
    expect(elemento().querySelector('[role="status"]')?.textContent).toContain('Agregamos');
    expect(componente.nuevo.getRawValue()).toEqual({ fechaInicio: '', fechaFin: '' });
  });

  it('criterio 2: no envía si la salida no es posterior a la llegada', async () => {
    await crear([]);
    escribir('form.tarjeta input[formControlName="fechaInicio"]', enDias(3));
    escribir('form.tarjeta input[formControlName="fechaFin"]', enDias(3));
    botonPorTexto('Agregar periodo')?.click();
    await fixture.whenStable();

    backend.expectNone(urlPeriodos);
    expect(elemento().querySelector('#error-salida')?.textContent).toContain(
      'posterior a la llegada',
    );
  });

  it('no acepta llegadas en el pasado ni fechas vacías', async () => {
    await crear([]);
    escribir('form.tarjeta input[formControlName="fechaInicio"]', '2000-01-01');
    botonPorTexto('Agregar periodo')?.click();
    await fixture.whenStable();

    backend.expectNone(urlPeriodos);
    expect(elemento().querySelector('#error-llegada')?.textContent).toContain('fecha futura');
    expect(elemento().querySelector('#error-salida')?.textContent).toContain('fecha de salida');
  });

  it('resume las noches que se habilitan', async () => {
    await crear([]);
    escribir('form.tarjeta input[formControlName="fechaInicio"]', '2027-12-04');
    escribir('form.tarjeta input[formControlName="fechaFin"]', '2027-12-05');
    await fixture.whenStable();
    const resumen = () => elemento().querySelector('.resumen')?.textContent ?? '';
    expect(resumen()).toContain('Se habilitan 1 noche: la del 4');

    escribir('form.tarjeta input[formControlName="fechaFin"]', '2027-12-07');
    await fixture.whenStable();
    expect(resumen()).toContain('Se habilitan 3 noches: del 4');
    expect(resumen()).toContain('al 6');
    expect(resumen()).toContain('sale a más tardar el 7');
  });

  it('permite agregar un periodo sin fecha de cierre por un año', async () => {
    await crear([]);
    escribir('form.tarjeta input[formControlName="fechaInicio"]', enDias(1));
    const casilla = elemento().querySelector<HTMLInputElement>('.sin-cierre input');
    casilla?.click();
    await fixture.whenStable();

    const salida = elemento().querySelector<HTMLInputElement>(
      'form.tarjeta input[formControlName="fechaFin"]',
    );
    const unAnio = new Date();
    unAnio.setDate(unAnio.getDate() + 1);
    unAnio.setFullYear(unAnio.getFullYear() + 1);
    expect(salida?.disabled).toBe(true);
    expect(componente.nuevo.getRawValue().fechaFin).toBe(comoDia(unAnio));

    botonPorTexto('Agregar periodo')?.click();
    const peticion = backend.expectOne(urlPeriodos);
    expect(peticion.request.body).toEqual({ fechaInicio: enDias(1), fechaFin: comoDia(unAnio) });
    peticion.flush(
      periodo({ idPeriodo: 'largo', fechaInicio: enDias(1), fechaFin: comoDia(unAnio) }),
    );
    await responderCalendario();

    expect(componente.sinCierre.value).toBe(false);
    expect(salida?.disabled).toBe(false);
  });

  it('edita un periodo existente', async () => {
    await crear();
    botonPorTexto('Editar')?.click();
    await fixture.whenStable();
    const formulario = elemento().querySelector('.periodos form') as HTMLFormElement;
    escribir('input[formControlName="fechaFin"]', '2027-01-20', formulario);
    botonPorTexto('Guardar')?.click();

    const peticion = backend.expectOne(`${urlPeriodos}/pe-1`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({ fechaInicio: '2027-01-10', fechaFin: '2027-01-20' });
    peticion.flush(periodo({ fechaFin: '2027-01-20' }));
    await responderCalendario();

    expect(elemento().querySelector('.periodos .nota')?.textContent).toContain('10 noches');
    expect(elemento().querySelector('.periodos form')).toBeNull();
  });

  it('al editar marca solo el campo que tiene el error', async () => {
    await crear();
    botonPorTexto('Editar')?.click();
    await fixture.whenStable();
    const formulario = elemento().querySelector('.periodos form') as HTMLFormElement;
    const llegada = () => formulario.querySelector('input[formControlName="fechaInicio"]');
    const salida = () => formulario.querySelector('input[formControlName="fechaFin"]');

    escribir('input[formControlName="fechaInicio"]', '', formulario);
    botonPorTexto('Guardar')?.click();
    await fixture.whenStable();

    backend.expectNone(`${urlPeriodos}/pe-1`);
    expect(llegada()?.getAttribute('aria-invalid')).toBe('true');
    expect(llegada()?.getAttribute('aria-describedby')).toBe('error-edicion-llegada');
    expect(llegada()?.hasAttribute('required')).toBe(true);
    expect(salida()?.getAttribute('aria-invalid')).toBe('false');
    expect(formulario.querySelector('#error-edicion-llegada')?.textContent).toContain('llegada');

    escribir('input[formControlName="fechaInicio"]', '2027-01-15', formulario);
    await fixture.whenStable();
    expect(llegada()?.getAttribute('aria-invalid')).toBe('false');
    expect(salida()?.getAttribute('aria-describedby')).toBe('error-edicion-salida');
    expect(formulario.querySelector('#error-edicion-salida')?.textContent).toContain(
      'posterior a la llegada',
    );
  });

  it('vuelve a validar la llegada al enviar por si cambió el día', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 20, 23, 59));
    try {
      await crear([]);
      escribir('form.tarjeta input[formControlName="fechaInicio"]', '2026-11-20');
      escribir('form.tarjeta input[formControlName="fechaFin"]', '2026-11-22');
      vi.setSystemTime(new Date(2026, 10, 21, 0, 1));
      botonPorTexto('Agregar periodo')?.click();
      await fixture.whenStable();

      backend.expectNone(urlPeriodos);
      expect(elemento().querySelector('#error-llegada')?.textContent).toContain('fecha futura');
    } finally {
      vi.useRealTimers();
    }
  });

  it('criterio 3: muestra que un periodo con reservas no se puede modificar', async () => {
    await crear();
    botonPorTexto('Editar')?.click();
    await fixture.whenStable();
    botonPorTexto('Guardar')?.click();
    backend.expectOne(`${urlPeriodos}/pe-1`).flush(
      {
        mensaje:
          'El periodo contiene noches asociadas a reservas vigentes o confirmadas y no puede modificarse.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();

    expect(elemento().querySelector('.periodos [role="alert"]')?.textContent).toContain(
      'reservas vigentes',
    );
    expect(elemento().querySelector('.periodos form')).not.toBeNull();
  });

  it('pide confirmación antes de deshabilitar un periodo', async () => {
    await crear();
    botonPorTexto('Deshabilitar')?.click();
    await fixture.whenStable();
    backend.expectNone(`${urlPeriodos}/pe-1`);

    botonPorTexto('No')?.click();
    await fixture.whenStable();
    expect(botonPorTexto('Sí, deshabilitar')).toBeUndefined();

    botonPorTexto('Deshabilitar')?.click();
    await fixture.whenStable();
    botonPorTexto('Sí, deshabilitar')?.click();
    const peticion = backend.expectOne(`${urlPeriodos}/pe-1`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(periodo({ habilitado: false }));
    await responderCalendario();

    expect(elemento().querySelector('.periodos li')?.classList).toContain('apagado');
    expect(elemento().querySelector('[role="status"]')?.textContent).toContain('Deshabilitamos');
  });

  it('criterio 4: informa si la publicación no es del anfitrión', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ idPublicacion: 'p-1' })) },
        },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DisponibilidadAlojamiento);
    fixture.detectChanges();
    TestBed.tick();
    backend
      .expectOne(urlDetalle)
      .flush({ mensaje: 'No' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'no pertenece a tu cuenta',
    );
  });

  it('permite reintentar si fallan los periodos', async () => {
    await crear(null);
    backend.expectOne(urlPeriodos).flush('Error', { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    botonPorTexto('Reintentar')?.click();
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(urlPeriodos).flush([periodo()]);
    await responderCalendario([periodo()]);

    expect(elemento().querySelectorAll('.periodos li.tarjeta')).toHaveLength(1);
  });

  it('HU-023 criterio 2: muestra el calendario y la consulta por fechas del alojamiento', async () => {
    await crear();

    expect(elemento().querySelector('app-calendario-disponibilidad table')).not.toBeNull();
    expect(elemento().querySelector('app-consulta-fechas form')).not.toBeNull();
    expect(elemento().querySelector('app-consulta-fechas .nota-inactiva')).not.toBeNull();
  });

  it('llena el formulario con los días elegidos en el calendario', async () => {
    await crear();
    componente.sinCierre.setValue(true);
    const calendario = fixture.debugElement.query(
      (nodo) => nodo.name === 'app-calendario-disponibilidad',
    );
    calendario.triggerEventHandler('seleccion', {
      fechaInicio: enDias(2),
      fechaFin: enDias(5),
    });
    await fixture.whenStable();

    expect(componente.nuevo.getRawValue()).toEqual({ fechaInicio: enDias(2), fechaFin: enDias(5) });
    expect(componente.sinCierre.value).toBe(false);
    expect(document.activeElement?.textContent?.trim()).toBe('Agregar periodo');
  });
});
