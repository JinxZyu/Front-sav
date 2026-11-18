import { HttpErrorResponse } from '@angular/common/http';

const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Intenta de nuevo.';

export function mensajeDeError(error: unknown, porDefecto = MENSAJE_GENERICO): string {
  if (!(error instanceof HttpErrorResponse)) {
    return porDefecto;
  }
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  }
  const cuerpo: unknown = error.error;
  if (typeof cuerpo === 'string' && cuerpo.trim() !== '') {
    return cuerpo;
  }
  if (cuerpo && typeof cuerpo === 'object' && 'message' in cuerpo) {
    const mensaje = (cuerpo as { message: unknown }).message;
    if (typeof mensaje === 'string' && mensaje.trim() !== '') {
      return mensaje;
    }
  }
  return porDefecto;
}
