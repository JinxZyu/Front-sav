import { formatearFecha, formatearPesos } from './formato';

describe('formato', () => {
  it('muestra los precios en pesos sin decimales', () => {
    expect(formatearPesos(250000).replaceAll(/\s/g, ' ')).toBe('$ 250.000');
  });

  it('muestra la fecha corta y tolera valores vacíos o inválidos', () => {
    expect(formatearFecha('2026-11-18T10:00:00-05:00')).toContain('2026');
    expect(formatearFecha(null)).toBe('');
    expect(formatearFecha('no es fecha')).toBe('');
  });
});
