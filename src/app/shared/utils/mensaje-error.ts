import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Intenta de nuevo.';

export function mensajeDeError(error: unknown, porDefecto = MENSAJE_GENERICO): string {
  if (error instanceof TimeoutError) {
    return 'El servidor tardó demasiado en responder. Intenta de nuevo.';
  }
  if (!(error instanceof HttpErrorResponse)) {
    return porDefecto;
  }
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  }
  const cuerpo = leerCuerpo(error.error);
  if (typeof cuerpo === 'string' && cuerpo.trim() !== '') {
    return cuerpo;
  }
  if (cuerpo && typeof cuerpo === 'object') {
    const { mensaje, message } = cuerpo as { mensaje?: unknown; message?: unknown };
    for (const texto of [mensaje, message]) {
      if (typeof texto === 'string' && texto.trim() !== '') {
        return texto;
      }
    }
  }
  return porDefecto;
}

function leerCuerpo(cuerpo: unknown): unknown {
  if (typeof cuerpo !== 'string' || !cuerpo.trim().startsWith('{')) {
    return cuerpo;
  }
  try {
    return JSON.parse(cuerpo) as unknown;
  } catch {
    return cuerpo;
  }
}
