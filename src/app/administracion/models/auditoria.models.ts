export interface EventoAuditoria {
  idEvento: string;
  idUsuario: string | null;
  fechaEvento: string;
  accion: string;
  resultado: string;
  entidadAfectada: string | null;
  idEntidadAfectada: string | null;
  detalleJson: string | null;
  idCorrelacion: string | null;
}

export interface PaginaAuditoria {
  eventos: EventoAuditoria[];
  pagina: number;
  tamano: number;
  totalResultados: number;
  totalPaginas: number;
  mensaje: string | null;
}

export interface FiltrosAuditoria {
  idUsuario: string;
  entidad: string;
  resultado: string;
  desde: string;
  hasta: string;
}

export interface OpcionFiltro {
  valor: string;
  nombre: string;
}

export interface Resultado {
  etiqueta: string;
  tono: string;
}

export const TAMANO_PAGINA_AUDITORIA = 20;

export const FILTROS_AUDITORIA_VACIOS: FiltrosAuditoria = {
  idUsuario: '',
  entidad: '',
  resultado: '',
  desde: '',
  hasta: '',
};

export const ENTIDADES_AUDITORIA: readonly (OpcionFiltro & { singular: string })[] = [
  { valor: 'USUARIO', nombre: 'Usuarios', singular: 'Usuario' },
  { valor: 'PUBLICACION', nombre: 'Publicaciones', singular: 'Publicación' },
  { valor: 'RESERVA', nombre: 'Reservas', singular: 'Reserva' },
  { valor: 'RESENA', nombre: 'Reseñas', singular: 'Reseña' },
  { valor: 'EXPORTACION_REPORTE', nombre: 'Reportes', singular: 'Reporte' },
  { valor: 'ENDPOINT', nombre: 'Errores del sistema', singular: 'Petición al sistema' },
];

export const RESULTADOS_AUDITORIA: readonly OpcionFiltro[] = [
  { valor: 'EXITOSO', nombre: 'Exitosos' },
  { valor: 'FALLIDO', nombre: 'Fallidos' },
  { valor: 'PENDIENTE', nombre: 'Pendientes' },
];

const RESULTADOS: Record<string, Resultado> = {
  EXITOSO: { etiqueta: 'Exitoso', tono: 'activa' },
  FALLIDO: { etiqueta: 'Fallido', tono: 'rechazo' },
  PENDIENTE: { etiqueta: 'Pendiente', tono: 'borrador' },
};

const ACCIONES: Record<string, string> = {
  INICIO_SESION: 'Inicio de sesión',
  AUTENTICACION_TOKEN: 'Validación de sesión',
  ENVIO_PUBLICACION_REVISION: 'Envío de publicación a revisión',
};

const PALABRAS: Record<string, string> = {
  ACTIVACION: 'activación',
  APROBACION: 'aprobación',
  AUTENTICACION: 'autenticación',
  CANCELACION: 'cancelación',
  CONFIGURACION: 'configuración',
  CONTRASENA: 'contraseña',
  CREACION: 'creación',
  DESACTIVACION: 'desactivación',
  ENVIO: 'envío',
  EXCEPCION: 'excepción',
  EXPORTACION: 'exportación',
  HTTP: 'HTTP',
  INFORMACION: 'información',
  INVALIDO: 'inválido',
  METODO: 'método',
  MODIFICACION: 'modificación',
  NOTIFICACION: 'notificación',
  PUBLICACION: 'publicación',
  RESENA: 'reseña',
  RESTRICCION: 'restricción',
  REVISION: 'revisión',
  SESION: 'sesión',
  VERIFICACION: 'verificación',
};

const PETICION_FALLIDA = /^HTTP_([A-Z]+)_(\d{3})$/;

function unirPalabras(palabras: string[]): string {
  const texto = palabras
    .filter(Boolean)
    .map((palabra) => PALABRAS[palabra.toUpperCase()] ?? palabra.toLowerCase())
    .join(' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function humanizarCodigo(codigo: string): string {
  return ACCIONES[codigo] ?? unirPalabras(codigo.split('_'));
}

export function accionAuditoria(accion: string): string {
  const peticion = PETICION_FALLIDA.exec(accion);
  if (peticion) {
    return `Petición ${peticion[1]} con error ${peticion[2]}`;
  }
  return humanizarCodigo(accion);
}

export function resultadoAuditoria(resultado: string): Resultado {
  return RESULTADOS[resultado] ?? { etiqueta: humanizarCodigo(resultado), tono: 'neutro' };
}

export function entidadAuditoria(entidad: string | null): string | null {
  if (!entidad) {
    return null;
  }
  return (
    ENTIDADES_AUDITORIA.find((opcion) => opcion.valor === entidad)?.singular ??
    humanizarCodigo(entidad)
  );
}

export function nombreCampoDetalle(campo: string): string {
  return unirPalabras(campo.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[\s_]+/));
}
