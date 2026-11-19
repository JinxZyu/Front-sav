import { FormControl, FormGroup } from '@angular/forms';
import {
  INDICATIVOS_TELEFONO,
  ejemploTelefono,
  indicativoDePais,
  telefonoInternacional,
  telefonoValido,
} from './telefono';

describe('utilidades de teléfono', () => {
  it('lista cada indicativo una sola vez, en orden numérico', () => {
    const indicativos = INDICATIVOS_TELEFONO.map((opcion) => opcion.indicativo);
    expect(indicativos.length).toBeGreaterThan(200);
    expect(new Set(indicativos).size).toBe(indicativos.length);
    expect(indicativos[0]).toBe('1');
    expect(indicativos.map(Number)).toEqual([...indicativos.map(Number)].sort((a, b) => a - b));
    expect(INDICATIVOS_TELEFONO.find((opcion) => opcion.indicativo === '57')?.pais).toBe('CO');
    expect(INDICATIVOS_TELEFONO.find((opcion) => opcion.indicativo === '1')?.pais).toBe('US');
  });

  it('arma el número internacional solo si es válido para el indicativo', () => {
    expect(telefonoInternacional('323 724 1960', '57')).toBe('+573237241960');
    expect(telefonoInternacional('(213) 373-4253', '1')).toBe('+12133734253');
    expect(telefonoInternacional('+52 55 1234 5678', '57')).toBe('+525512345678');
    expect(telefonoInternacional(' +57 300 123 4567 ', '57')).toBe('+573001234567');
    expect(telefonoInternacional('323724196', '57')).toBeNull();
    expect(telefonoInternacional('12ab', '57')).toBeNull();
  });

  it('rechaza texto adicional alrededor del número', () => {
    expect(telefonoInternacional('Call: (213) 373-4253', '1')).toBeNull();
    expect(telefonoInternacional('3237241960 celular', '57')).toBeNull();
  });

  it('da un número de ejemplo del indicativo elegido', () => {
    expect(ejemploTelefono('57')).toMatch(/^3\d{2} \d{7}$/);
    expect(ejemploTelefono('999')).toBe('');
  });

  it('valida el número según el indicativo del mismo formulario', () => {
    const formulario = new FormGroup({
      indicativo: new FormControl('57'),
      telefono: new FormControl('', [telefonoValido('indicativo')]),
    });
    const telefono = formulario.controls.telefono;

    telefono.setValue('3237241960');
    expect(telefono.valid).toBe(true);

    formulario.controls.indicativo.setValue('34');
    telefono.updateValueAndValidity();
    expect(telefono.hasError('telefono')).toBe(true);

    telefono.setValue('');
    expect(telefono.valid).toBe(true);
  });

  it('no valida si el campo no está dentro de un formulario', () => {
    expect(new FormControl('123', [telefonoValido('indicativo')]).valid).toBe(true);
  });

  it('obtiene el indicativo a partir del código del país', () => {
    expect(indicativoDePais('co')).toBe('57');
    expect(indicativoDePais('US')).toBe('1');
    expect(indicativoDePais('XX')).toBeNull();
  });
});
