import { FormControl, FormGroup } from '@angular/forms';
import { PATRON_CON_TEXTO, contrasenasIguales } from './validadores';

describe('validadores', () => {
  const grupo = (nuevaContrasena: string, confirmacion: string) =>
    new FormGroup(
      {
        nuevaContrasena: new FormControl(nuevaContrasena),
        confirmacion: new FormControl(confirmacion),
      },
      { validators: contrasenasIguales },
    );

  it('marca error si la confirmación no coincide', () => {
    expect(grupo('clave-segura', 'otra-clave').hasError('noCoinciden')).toBe(true);
  });

  it('acepta contraseñas iguales o campos aún vacíos', () => {
    expect(grupo('clave-segura', 'clave-segura').valid).toBe(true);
    expect(grupo('clave-segura', '').valid).toBe(true);
  });

  it('reconoce texto que no es solo espacios', () => {
    expect(PATRON_CON_TEXTO.test('  Ana ')).toBe(true);
    expect(PATRON_CON_TEXTO.test('   ')).toBe(false);
  });
});
