const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const FECHA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatearPesos(valor: number): string {
  return PESOS.format(valor);
}

export function formatearFecha(valor: string | null): string {
  if (!valor) {
    return '';
  }
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '' : FECHA.format(fecha);
}
