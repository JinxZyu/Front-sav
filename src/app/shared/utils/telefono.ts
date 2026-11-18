import { ValidatorFn } from '@angular/forms';
import {
  CountryCode,
  getExampleNumber,
  isSupportedCountry,
  parsePhoneNumberFromString,
} from 'libphonenumber-js/max';
import metadatos from 'libphonenumber-js/max/metadata';
import ejemplos from 'libphonenumber-js/mobile/examples';

export interface IndicativoTelefono {
  indicativo: string;
  pais: CountryCode;
}

export const INDICATIVO_POR_DEFECTO = '57';

export const INDICATIVOS_TELEFONO: readonly IndicativoTelefono[] = Object.entries(
  metadatos.country_calling_codes,
)
  .flatMap(([indicativo, [pais]]) =>
    pais && isSupportedCountry(pais) ? [{ indicativo, pais }] : [],
  )
  .sort((a, b) => Number(a.indicativo) - Number(b.indicativo));

export const telefonoInternacional = (numero: string, indicativo: string): string | null => {
  const telefono = parsePhoneNumberFromString(numero.trim(), {
    defaultCallingCode: indicativo,
    extract: false,
  });
  return telefono?.isValid() ? telefono.number : null;
};

export const ejemploTelefono = (indicativo: string): string => {
  const pais = INDICATIVOS_TELEFONO.find((opcion) => opcion.indicativo === indicativo)?.pais;
  return pais ? (getExampleNumber(pais, ejemplos)?.formatNational() ?? '') : '';
};

export const telefonoValido =
  (campoIndicativo: string): ValidatorFn =>
  (control) => {
    const indicativo = control.parent?.get(campoIndicativo)?.value as string | undefined;
    const numero = String(control.value ?? '').trim();
    if (!numero || !indicativo) {
      return null;
    }
    return telefonoInternacional(numero, indicativo) ? null : { telefono: true };
  };
