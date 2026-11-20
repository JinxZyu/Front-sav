import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { comoDia } from '../../utils/fechas';
import { CalendarioDisponibilidad } from './calendario-disponibilidad';

describe('CalendarioDisponibilidad (HU-023)', () => {
  let fixture: ComponentFixture<CalendarioDisponibilidad>;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/alojamientos/a-1/calendario`;

  const enDias = (dias: number) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return comoDia(fecha);
  };

  const crear = async (respuesta: object | null) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18, 12));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CalendarioDisponibilidad);
    fixture.componentRef.setInput('idAlojamiento', 'a-1');
    fixture.detectChanges();
    TestBed.tick();
    if (respuesta) {
      backend.expectOne(url).flush(respuesta);
      await fixture.whenStable();
    }
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const dia = (numero: number) =>
    [...elemento().querySelectorAll<HTMLElement>('.dia')].find(
      (celda) => celda.textContent?.trim() === String(numero),
    );

  afterEach(() => {
    backend.verify();
    vi.useRealTimers();
  });

  it('criterios 2 y 3: marca días disponibles, ocupados, pasados y sin periodo', async () => {
    await crear({
      idAlojamiento: 'a-1',
      periodos: [
        { idPeriodo: '1', fechaInicio: '2026-11-15', fechaFin: '2026-11-25', habilitado: true },
        { idPeriodo: '2', fechaInicio: '2026-11-26', fechaFin: '2026-11-29', habilitado: false },
      ],
      nochesOcupadas: ['2026-11-20', '2026-11-21'],
    });

    expect(elemento().querySelector('h3')?.textContent?.trim()).toBe('Noviembre de 2026');
    expect((dia(1)?.parentElement as HTMLTableCellElement | undefined)?.cellIndex).toBe(6);
    expect(dia(17)?.classList).toContain('pasada');
    expect(dia(19)?.classList).toContain('disponible');
    expect(dia(20)?.classList).toContain('ocupada');
    expect(dia(20)?.getAttribute('aria-label')).toBe('20 de noviembre: ocupada por una reserva');
    expect(dia(24)?.classList).toContain('disponible');
    expect(dia(25)?.classList).toContain('sin-periodo');
    expect(dia(27)?.classList).toContain('sin-periodo');
    expect(elemento().querySelectorAll('tbody tr')).toHaveLength(6);
  });

  it('cambia de mes sin permitir ir antes del mes actual', async () => {
    await crear({ idAlojamiento: 'a-1', periodos: [], nochesOcupadas: [] });
    const [anterior, siguiente] = elemento().querySelectorAll<HTMLButtonElement>('.flecha');

    expect(anterior.disabled).toBe(true);
    siguiente.click();
    await fixture.whenStable();
    expect(elemento().querySelector('h3')?.textContent?.trim()).toBe('Diciembre de 2026');
    expect(anterior.disabled).toBe(false);
    anterior.click();
    await fixture.whenStable();
    expect(elemento().querySelector('h3')?.textContent?.trim()).toBe('Noviembre de 2026');
  });

  it('muestra que está cargando antes de clasificar los días', async () => {
    await crear(null);

    expect(elemento().querySelector('[role="status"]')?.textContent).toContain(
      'Cargando calendario',
    );
    expect(elemento().querySelector('table')).toBeNull();
    expect(elemento().querySelector('.leyenda')).toBeNull();

    backend.expectOne(url).flush({ idAlojamiento: 'a-1', periodos: [], nochesOcupadas: [] });
    await fixture.whenStable();
    expect(elemento().querySelector('table')).not.toBeNull();
    expect(dia(20)?.classList).toContain('sin-periodo');
  });

  it('vuelve a consultar cuando cambian los periodos', async () => {
    await crear({ idAlojamiento: 'a-1', periodos: [], nochesOcupadas: [] });
    fixture.componentRef.setInput('actualizacion', 1);
    fixture.detectChanges();
    TestBed.tick();

    backend.expectOne(url).flush({
      idAlojamiento: 'a-1',
      periodos: [{ fechaInicio: enDias(0), fechaFin: enDias(2), habilitado: true }],
      nochesOcupadas: [],
    });
    await fixture.whenStable();
    expect(dia(18)?.classList).toContain('disponible');
  });

  it('permite reintentar si falla la consulta', async () => {
    await crear(null);
    backend.expectOne(url).flush('Error', { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Error');
    elemento().querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(url).flush({ idAlojamiento: 'a-1', periodos: [], nochesOcupadas: [] });
    await fixture.whenStable();
    expect(elemento().querySelector('table')).not.toBeNull();
  });

  it('permite elegir un rango de días futuros y lo entrega como periodo', async () => {
    await crear({ idAlojamiento: 'a-1', periodos: [], nochesOcupadas: [] });
    const elegidos: object[] = [];
    fixture.componentInstance.seleccion.subscribe((periodo) => elegidos.push(periodo));

    expect(dia(10)?.tagName).toBe('SPAN');
    expect(dia(20)?.tagName).toBe('BUTTON');

    dia(24)?.click();
    dia(21)?.click();
    await fixture.whenStable();
    expect(elegidos).toEqual([]);
    expect(dia(21)?.getAttribute('aria-pressed')).toBe('true');
    expect(dia(24)?.getAttribute('aria-pressed')).toBe('false');

    dia(25)?.click();
    await fixture.whenStable();
    expect(elegidos).toEqual([{ fechaInicio: '2026-11-21', fechaFin: '2026-11-26' }]);
    expect([21, 22, 25].map((numero) => dia(numero)?.classList.contains('elegido'))).toEqual([
      true,
      true,
      true,
    ]);
    expect(dia(26)?.classList.contains('elegido')).toBe(false);

    fixture.componentRef.setInput('actualizacion', 1);
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(url).flush({ idAlojamiento: 'a-1', periodos: [], nochesOcupadas: [] });
    await fixture.whenStable();
    expect(dia(21)?.classList.contains('elegido')).toBe(false);
  });
});
