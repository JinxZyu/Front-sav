import { HttpErrorResponse } from '@angular/common/http';
import { ResourceRef, computed } from '@angular/core';
import { mensajeDeError } from '../../shared/utils/mensaje-error';

export function estadoDeConsulta<T>(consulta: ResourceRef<T | undefined>) {
  const noEncontrada = computed(() => {
    const error = consulta.status() === 'error' ? consulta.error() : null;
    return error instanceof HttpErrorResponse && [400, 403, 404].includes(error.status);
  });
  return {
    valor: computed(() => (consulta.hasValue() ? (consulta.value() as T) : null)),
    noEncontrada,
    error: computed(() =>
      consulta.status() === 'error' && !noEncontrada()
        ? mensajeDeError(consulta.error(), 'No pudimos consultar la reserva.')
        : null,
    ),
  };
}
