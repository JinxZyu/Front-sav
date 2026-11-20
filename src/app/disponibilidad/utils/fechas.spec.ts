import { FormControl, FormGroup } from '@angular/forms';
import { comoDia, comoFecha, desdeHoy, formatearDia, hoy, noches, rangoValido } from './fechas';

describe('utilidades de fechas', () => {
  it('convierte entre texto y fecha local sin correrse de día', () => {
    const fecha = comoFecha('2026-12-01');
    expect(fecha?.getDate()).toBe(1);
    expect(fecha?.getMonth()).toBe(11);
    expect(comoDia(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(comoFecha('no')).toBeNull();
  });

  it('formatea el día y cuenta las noches', () => {
    expect(formatearDia('2026-12-01')).toContain('2026');
    expect(formatearDia('x')).toBe('x');
    expect(noches('2026-12-01', '2026-12-05')).toBe(4);
    expect(noches('2026-12-01', 'x')).toBe(0);
  });

  it('exige que la salida sea posterior a la llegada', () => {
    const grupo = new FormGroup(
      { inicio: new FormControl('2026-12-05'), fin: new FormControl('2026-12-05') },
      { validators: rangoValido('inicio', 'fin') },
    );
    expect(grupo.hasError('rango')).toBe(true);
    grupo.controls.fin.setValue('2026-12-06');
    expect(grupo.hasError('rango')).toBe(false);
    grupo.controls.fin.setValue('');
    expect(grupo.hasError('rango')).toBe(false);
  });

  it('no acepta fechas pasadas', () => {
    expect(desdeHoy(new FormControl('2000-01-01'))).toEqual({ pasado: true });
    expect(desdeHoy(new FormControl(hoy()))).toBeNull();
    expect(desdeHoy(new FormControl(''))).toBeNull();
  });
});
