import { ValidatorFn } from '@angular/forms';
import {
  CountryCode,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';
import ejemplos from 'libphonenumber-js/mobile/examples';

export interface PaisTelefono {
  codigo: CountryCode;
  nombre: string;
  indicativo: string;
}

const nombres = new Intl.DisplayNames(['es'], { type: 'region' });

export const PAISES_TELEFONO: readonly PaisTelefono[] = getCountries()
  .map((codigo) => ({
    codigo,
    nombre: nombres.of(codigo) ?? codigo,
    indicativo: getCountryCallingCode(codigo),
  }))
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

export const telefonoInternacional = (numero: string, pais: CountryCode): string | null => {
  const telefono = parsePhoneNumberFromString(numero, pais);
  return telefono?.isValid() ? telefono.number : null;
};

export const ejemploTelefono = (pais: CountryCode): string =>
  getExampleNumber(pais, ejemplos)?.formatNational() ?? '';

export const telefonoValido =
  (campoPais: string): ValidatorFn =>
  (control) => {
    const pais = control.parent?.get(campoPais)?.value as CountryCode | undefined;
    const numero = String(control.value ?? '').trim();
    if (!numero || !pais) {
      return null;
    }
    return telefonoInternacional(numero, pais) ? null : { telefono: true };
  };
