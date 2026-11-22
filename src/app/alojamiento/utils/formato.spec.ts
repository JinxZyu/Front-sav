import { formatearEspacios, formatearFecha, formatearPesos, formatearPesosCortos } from './formato';

describe('formato', () => {
  it('muestra los precios en pesos sin decimales', () => {
    expect(formatearPesos(250000).replaceAll(/\s/g, ' ')).toBe('$ 250.000');
  });

  describe('pesos cortos', () => {
    const limpio = (texto: string) => texto.replaceAll(/\s/g, ' ');

    it('deja la cifra completa mientras cabe en la tarjeta', () => {
      expect(limpio(formatearPesosCortos(0))).toBe('$ 0');
      expect(limpio(formatearPesosCortos(273998))).toBe('$ 273.998');
      expect(limpio(formatearPesosCortos(15250000))).toBe('$ 15.250.000');
    });

    it('con una cifra muy grande usa la forma corta con millones', () => {
      expect(limpio(formatearPesosCortos(120000000))).toBe('$120 M');
      expect(limpio(formatearPesosCortos(98765432100))).toContain('M');
      expect(formatearPesosCortos(98765432100).length).toBeLessThanOrEqual(12);
    });

    it('también acorta los valores negativos grandes', () => {
      expect(limpio(formatearPesosCortos(-120000000))).toBe('-$120 M');
    });

    it('el límite se puede ajustar según el ancho disponible', () => {
      expect(limpio(formatearPesosCortos(120000000, 14))).toBe('$ 120.000.000');
    });
  });

  it('muestra la fecha corta y tolera valores vacíos o inválidos', () => {
    expect(formatearFecha('2026-11-18T10:00:00-05:00')).toContain('2026');
    expect(formatearFecha(null)).toBe('');
    expect(formatearFecha('no es fecha')).toBe('');
  });

  it('describe cada espacio en singular o plural', () => {
    expect(formatearEspacios({ habitaciones: 1, camas: 1, banos: 1 })).toEqual([
      '1 habitación',
      '1 cama',
      '1 baño',
    ]);
    expect(formatearEspacios({ habitaciones: 3, camas: 4, banos: 2 })).toEqual([
      '3 habitaciones',
      '4 camas',
      '2 baños',
    ]);
  });
});
