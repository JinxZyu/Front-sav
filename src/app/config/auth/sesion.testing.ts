export function crearToken(datos: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(datos));
  const base64 = btoa(String.fromCodePoint(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return `encabezado.${base64}.firma`;
}
