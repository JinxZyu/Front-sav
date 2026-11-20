import { formatearEspacios, formatearFecha, formatearPesos } from './formato';

describe('formato', () => {
  it('muestra los precios en pesos sin decimales', () => {
    expect(formatearPesos(250000).replaceAll(/\s/g, ' ')).toBe('$ 250.000');
  });

  it('muestra la fecha corta y tolera valores vacíos o inválidos', () => {
    expect(formatearFecha('2026-11-18T10:00:00-05:00')).toContain('2026');
    expect(formatearFecha(null)).toBe('');
    expect(formatearFecha('no es fecha')).toBe('');
  });

  it('describe los espacios en singular o plural', () => {
    expect(formatearEspacios({ habitaciones: 1, camas: 1, banos: 1 })).toBe(
      '1\u00a0habitación · 1\u00a0cama · 1\u00a0baño',
    );
    expect(formatearEspacios({ habitaciones: 3, camas: 4, banos: 2 })).toBe(
      '3\u00a0habitaciones · 4\u00a0camas · 2\u00a0baños',
    );
  });
});
