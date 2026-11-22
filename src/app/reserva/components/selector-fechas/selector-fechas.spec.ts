import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { comoDia, hoy, moverDias } from '../../../disponibilidad/utils/fechas';
import { FechasElegidas, SelectorFechas, criterioDeNoches, nochesLibres } from './selector-fechas';

describe('SelectorFechas', () => {
  let fixture: ComponentFixture<SelectorFechas>;
  let backend: HttpTestingController;
  let elegidas: FechasElegidas[];

  const hoyDate = new Date();
  const inicioMesSiguiente = comoDia(new Date(hoyDate.getFullYear(), hoyDate.getMonth() + 1, 1));
  const dia = (desplazamiento: number) => moverDias(inicioMesSiguiente, desplazamiento);

  const crear = (entradas: Record<string, string> = {}) => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SelectorFechas);
    fixture.componentRef.setInput('idAlojamiento', 'a-1');
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    elegidas = [];
    fixture.componentInstance.elegir.subscribe((fechas) => elegidas.push(fechas));
    fixture.detectChanges();
    TestBed.tick();
  };

  const responder = async (cuerpo: object, opciones?: { status: number; statusText: string }) => {
    const peticion = backend.expectOne((solicitud) =>
      solicitud.url.endsWith('/alojamientos/a-1/disponibilidad'),
    );
    expect(peticion.request.params.get('fechaInicio')).toBe(hoy());
    expect(peticion.request.params.get('fechaFin')).toBe(moverDias(hoy(), 366));
    peticion.flush(cuerpo, opciones);
    await fixture.whenStable();
  };

  const datos = {
    nochesOcupadas: [dia(4)],
    periodosDisponibles: [
      { fechaInicio: hoy(), fechaFin: dia(10) },
      { fechaInicio: dia(12), fechaFin: moverDias(hoy(), 366) },
    ],
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const siguienteMes = async () => {
    (elemento().querySelector('button[aria-label="Mes siguiente"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const celda = (desplazamiento: number) => {
    const numero = String(Number(dia(desplazamiento).slice(8)));
    return [...elemento().querySelectorAll<HTMLButtonElement>('button.dia')].find(
      (boton) => boton.textContent?.trim() === numero,
    ) as HTMLButtonElement;
  };

  afterEach(() => backend.verify());

  it('avisa mientras consulta la disponibilidad', async () => {
    crear();
    expect(elemento().textContent).toContain('Consultando disponibilidad');
    await responder(datos);
  });

  it('marca como no disponibles las noches reservadas y las que no tienen periodo', async () => {
    crear();
    await responder(datos);
    await siguienteMes();

    expect(celda(2).classList).toContain('libre');
    expect(celda(4).classList).toContain('no-disponible');
    expect(celda(4).disabled).toBe(true);
    expect(celda(4).getAttribute('aria-label')).toContain('no disponible');
    expect(celda(10).classList).toContain('no-disponible');
    expect(celda(11).classList).toContain('no-disponible');
    expect(celda(12).classList).toContain('libre');
    expect(elemento().textContent).toContain('Elige el día de llegada.');
  });

  it('muestra el mes de la llegada recibida y lo sigue cuando cambia', async () => {
    const llegadaLejana = moverDias(inicioMesSiguiente, 40);
    const fecha = new Date(`${llegadaLejana}T00:00:00`);
    const titulo = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(
      new Date(fecha.getFullYear(), fecha.getMonth(), 1),
    );
    crear({ llegada: llegadaLejana });
    await responder(datos);

    const mes = () => elemento().querySelector('.mes')?.textContent?.trim().toLowerCase();
    expect(mes()).toBe(titulo.toLowerCase());

    fixture.componentRef.setInput('llegada', dia(1));
    fixture.detectChanges();
    const siguiente = new Date(`${inicioMesSiguiente}T00:00:00`);
    expect(mes()).toBe(
      new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })
        .format(siguiente)
        .toLowerCase(),
    );

    fixture.componentRef.setInput('llegada', '');
    fixture.detectChanges();
    expect(mes()).toBe(
      new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })
        .format(siguiente)
        .toLowerCase(),
    );
  });

  it('no deja ir antes del mes actual', async () => {
    crear();
    await responder(datos);
    const anterior = elemento().querySelector(
      'button[aria-label="Mes anterior"]',
    ) as HTMLButtonElement;
    expect(anterior.disabled).toBe(true);
    await siguienteMes();
    expect(anterior.disabled).toBe(false);
  });

  it('elige la llegada y luego una salida con todas las noches libres', async () => {
    crear();
    await responder(datos);
    await siguienteMes();

    celda(1).click();
    expect(elegidas).toEqual([{ llegada: dia(1), salida: '' }]);

    fixture.componentRef.setInput('llegada', dia(1));
    fixture.detectChanges();
    expect(elemento().textContent).toContain('Ahora elige el día de salida.');
    expect(celda(4).disabled).toBe(false);
    celda(4).click();
    expect(elegidas.at(-1)).toEqual({ llegada: dia(1), salida: dia(4) });

    fixture.componentRef.setInput('salida', dia(4));
    fixture.detectChanges();
    expect(celda(1).classList).toContain('extremo');
    expect(celda(2).classList).toContain('rango');
    expect(celda(4).classList).toContain('extremo');
    expect(celda(1).getAttribute('aria-pressed')).toBe('true');
  });

  it('si se elige un día que no sirve como salida empieza de nuevo desde ahí', async () => {
    crear({ llegada: dia(5) });
    await responder(datos);

    expect(celda(12).disabled).toBe(false);
    celda(12).click();
    expect(elegidas).toEqual([{ llegada: dia(12), salida: '' }]);

    celda(2).click();
    expect(elegidas.at(-1)).toEqual({ llegada: dia(2), salida: '' });
  });

  it('con fechas completas un nuevo toque empieza otra llegada', async () => {
    crear({ llegada: dia(1), salida: dia(3) });
    await responder(datos);

    celda(6).click();
    expect(elegidas).toEqual([{ llegada: dia(6), salida: '' }]);
  });

  it('volver a pulsar la llegada elegida la desmarca', async () => {
    crear({ llegada: dia(1) });
    await responder(datos);

    expect(celda(1).disabled).toBe(false);
    celda(1).click();
    expect(elegidas).toEqual([{ llegada: '', salida: '' }]);
  });

  it('con la llegada y la salida elegidas, pulsar la llegada limpia ambas', async () => {
    crear({ llegada: dia(1), salida: dia(3) });
    await responder(datos);

    celda(1).click();
    expect(elegidas).toEqual([{ llegada: '', salida: '' }]);
  });

  it('volver a pulsar la salida elegida la desmarca y conserva la llegada', async () => {
    crear({ llegada: dia(1), salida: dia(3) });
    await responder(datos);

    celda(3).click();
    expect(elegidas).toEqual([{ llegada: dia(1), salida: '' }]);
  });

  it('una salida elegida cuya noche no está libre igual se puede desmarcar', async () => {
    // dia(10) es donde termina el primer periodo: sirve como salida, pero esa noche ya no está disponible.
    crear({ llegada: dia(8), salida: dia(10) });
    await responder(datos);

    expect(celda(10).disabled).toBe(false);
    celda(10).click();
    expect(elegidas).toEqual([{ llegada: dia(8), salida: '' }]);
  });

  it('si falla la consulta permite reintentar', async () => {
    crear();
    await responder({ mensaje: 'Error' }, { status: 500, statusText: 'Error' });

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos consultar la disponibilidad',
    );
    (elemento().querySelector('button.texto') as HTMLButtonElement).click();
    fixture.detectChanges();
    await responder(datos);
    expect(elemento().querySelector('table')).not.toBeNull();
  });
});

describe('criterioDeNoches y nochesLibres', () => {
  const base = {
    idAlojamiento: 'a-1',
    fechaInicio: '2027-01-01',
    fechaFin: '2027-02-01',
    disponible: false,
    cubiertoPorPeriodosDisponibles: false,
    nochesOcupadas: ['2027-01-05'],
  };

  it('sin periodos en la respuesta solo descarta las noches ocupadas y fuera de rango', () => {
    const libre = criterioDeNoches(base, '2027-01-01', '2027-02-01');
    expect(libre('2027-01-04')).toBe(true);
    expect(libre('2027-01-05')).toBe(false);
    expect(libre('2026-12-31')).toBe(false);
    expect(libre('2027-02-01')).toBe(false);
  });

  it('con periodos solo acepta las noches dentro de alguno', () => {
    const libre = criterioDeNoches(
      { ...base, periodosDisponibles: [{ fechaInicio: '2027-01-10', fechaFin: '2027-01-12' }] },
      '2027-01-01',
      '2027-02-01',
    );
    expect(libre('2027-01-09')).toBe(false);
    expect(libre('2027-01-10')).toBe(true);
    expect(libre('2027-01-11')).toBe(true);
    expect(libre('2027-01-12')).toBe(false);
  });

  it('revisa cada noche entre la llegada y la salida', () => {
    const libre = criterioDeNoches(base, '2027-01-01', '2027-02-01');
    expect(nochesLibres('2027-01-02', '2027-01-05', libre)).toBe(true);
    expect(nochesLibres('2027-01-02', '2027-01-06', libre)).toBe(false);
  });
});
