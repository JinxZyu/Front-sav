export type FormatoReporte = 'PDF' | 'EXCEL';

export interface ExportacionReporte {
  idExportacion: string;
  estado: string;
  formato: FormatoReporte;
  fechaSolicitud: string;
  mensaje: string;
  urlDescarga: string | null;
}

export interface OpcionFormato {
  valor: FormatoReporte;
  nombre: string;
  extension: string;
}

export interface EstadoExportacion {
  etiqueta: string;
  tono: string;
  detalle: string;
}

export const FORMATOS_REPORTE: readonly OpcionFormato[] = [
  { valor: 'PDF', nombre: 'PDF', extension: 'pdf' },
  { valor: 'EXCEL', nombre: 'Excel', extension: 'xlsx' },
];

export const ESTADOS_EXPORTACION_EN_CURSO = ['SOLICITADO', 'EN_PROCESO'];

export const INTERVALO_CONSULTA_REPORTE = 3000;

const EN_CURSO =
  'Te avisaremos en tus notificaciones cuando esté listo; puedes salir de esta página.';

const ESTADOS: Record<string, EstadoExportacion> = {
  SOLICITADO: {
    etiqueta: 'En cola',
    tono: 'neutro',
    detalle: `Estamos por generarlo. ${EN_CURSO}`,
  },
  EN_PROCESO: {
    etiqueta: 'Generando',
    tono: 'neutro',
    detalle: `Lo estamos generando. ${EN_CURSO}`,
  },
  COMPLETADO: {
    etiqueta: 'Listo',
    tono: 'activa',
    detalle: 'El reporte está listo para descargar.',
  },
  FALLIDO: {
    etiqueta: 'Falló',
    tono: 'rechazo',
    detalle: 'No pudimos generar este reporte. Genera uno nuevo para intentarlo otra vez.',
  },
};

export function estadoExportacion(estado: string): EstadoExportacion {
  return ESTADOS[estado] ?? { etiqueta: estado, tono: 'neutro', detalle: '' };
}

export function formatoReporte(formato: string): OpcionFormato {
  return (
    FORMATOS_REPORTE.find((opcion) => opcion.valor === formato) ?? {
      valor: formato as FormatoReporte,
      nombre: formato,
      extension: formato.toLowerCase(),
    }
  );
}
