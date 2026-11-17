/** Crea un JWT de prueba (sin firma real) con los datos indicados. Solo para pruebas. */
export function crearToken(datos: object): string {
  const base64 = btoa(JSON.stringify(datos))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return `encabezado.${base64}.firma`;
}
