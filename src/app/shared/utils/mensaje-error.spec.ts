import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { mensajeDeError } from './mensaje-error';

describe('mensajeDeError', () => {
  it('usa el mensaje por defecto si no es un error HTTP', () => {
    expect(mensajeDeError(new Error('x'), 'Por defecto')).toBe('Por defecto');
  });

  it('avisa cuando el servidor tarda demasiado', () => {
    expect(mensajeDeError(new TimeoutError())).toContain('tardó demasiado');
  });

  it('avisa cuando no hay conexión con el servidor', () => {
    const error = new HttpErrorResponse({ status: 0 });
    expect(mensajeDeError(error)).toContain('No se pudo conectar');
  });

  it('devuelve el texto plano que manda el backend', () => {
    const error = new HttpErrorResponse({ status: 401, error: 'Correo o contraseña incorrectos.' });
    expect(mensajeDeError(error)).toBe('Correo o contraseña incorrectos.');
  });

  it('devuelve el campo message de un error JSON', () => {
    const error = new HttpErrorResponse({ status: 400, error: { message: 'Dato inválido' } });
    expect(mensajeDeError(error)).toBe('Dato inválido');
  });

  it('usa el mensaje por defecto si el cuerpo está vacío o no sirve', () => {
    expect(mensajeDeError(new HttpErrorResponse({ status: 500, error: '  ' }), 'D')).toBe('D');
    expect(
      mensajeDeError(new HttpErrorResponse({ status: 500, error: { message: '' } }), 'D'),
    ).toBe('D');
    expect(mensajeDeError(new HttpErrorResponse({ status: 500, error: { otro: 1 } }), 'D')).toBe(
      'D',
    );
    expect(mensajeDeError(new HttpErrorResponse({ status: 500 }))).toContain('error inesperado');
  });

  it('devuelve el campo mensaje que usa el backend en sus respuestas JSON', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { mensaje: 'El código es inválido.' },
    });
    expect(mensajeDeError(error)).toBe('El código es inválido.');
  });
});
