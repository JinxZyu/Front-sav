import { FormControl, FormGroup } from '@angular/forms';
import {
  PAISES_TELEFONO,
  ejemploTelefono,
  telefonoInternacional,
  telefonoValido,
} from './telefono';

describe('utilidades de teléfono', () => {
  it('lista todos los países con nombre en español, ordenados', () => {
    const colombia = PAISES_TELEFONO.find((pais) => pais.codigo === 'CO');
    expect(PAISES_TELEFONO.length).toBeGreaterThan(200);
    expect(colombia).toEqual({ codigo: 'CO', nombre: 'Colombia', indicativo: '57' });
    const nombres = PAISES_TELEFONO.map((pais) => pais.nombre);
    expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('arma el número internacional solo si es válido para el país', () => {
    expect(telefonoInternacional('323 724 1960', 'CO')).toBe('+573237241960');
    expect(telefonoInternacional('+52 55 1234 5678', 'CO')).toBe('+525512345678');
    expect(telefonoInternacional('323724196', 'CO')).toBeNull();
    expect(telefonoInternacional('12ab', 'CO')).toBeNull();
  });

  it('da un número de ejemplo del país elegido', () => {
    expect(ejemploTelefono('CO')).toMatch(/^3\d{2} \d{7}$/);
  });

  it('valida el número según el país del mismo formulario', () => {
    const formulario = new FormGroup({
      pais: new FormControl('CO'),
      telefono: new FormControl('', [telefonoValido('pais')]),
    });
    const telefono = formulario.controls.telefono;

    telefono.setValue('3237241960');
    expect(telefono.valid).toBe(true);

    formulario.controls.pais.setValue('ES');
    telefono.updateValueAndValidity();
    expect(telefono.hasError('telefono')).toBe(true);

    telefono.setValue('');
    expect(telefono.valid).toBe(true);
  });

  it('no valida si el campo no está dentro de un formulario', () => {
    expect(new FormControl('123', [telefonoValido('pais')]).valid).toBe(true);
  });
});
