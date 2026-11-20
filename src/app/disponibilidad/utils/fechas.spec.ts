import { FormControl, FormGroup } from '@angular/forms';
import {
  comoDia,
  comoFecha,
  desdeHoy,
  formatearDia,
  hoy,
  moverDias,
  noches,
  rangoValido,
  unAnioDespues,
} from './fechas';

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

  it('mueve días y suma un año aunque cambie de mes o de año', () => {
    expect(moverDias('2026-11-30', 1)).toBe('2026-12-01');
    expect(moverDias('2027-01-01', -1)).toBe('2026-12-31');
    expect(unAnioDespues('2026-12-04')).toBe('2027-12-04');
    expect(unAnioDespues('2028-02-29')).toBe('2029-03-01');
    expect(moverDias('no es fecha', 1)).toBe('no es fecha');
    expect(unAnioDespues('no es fecha')).toBe('no es fecha');
  });
});
