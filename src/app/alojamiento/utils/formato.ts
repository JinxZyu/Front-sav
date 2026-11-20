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

const FECHA_HORA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatearFechaHora(valor: string | null): string {
  if (!valor) {
    return '';
  }
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '' : FECHA_HORA.format(fecha);
}

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

export function formatearEspacios(espacios: {
  habitaciones: number;
  camas: number;
  banos: number;
}): string[] {
  return [
    contar(espacios.habitaciones, 'habitación', 'habitaciones'),
    contar(espacios.camas, 'cama', 'camas'),
    contar(espacios.banos, 'baño', 'baños'),
  ];
}

function contar(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}
