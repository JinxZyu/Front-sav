import { AbstractControl, ValidationErrors } from '@angular/forms';

export const PATRON_CON_TEXTO = /\S/;

export const contrasenasIguales = (grupo: AbstractControl): ValidationErrors | null => {
  const nueva = grupo.get('nuevaContrasena')?.value;
  const confirmacion = grupo.get('confirmacion')?.value;
  return nueva && confirmacion && nueva !== confirmacion ? { noCoinciden: true } : null;
};
