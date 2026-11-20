export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
