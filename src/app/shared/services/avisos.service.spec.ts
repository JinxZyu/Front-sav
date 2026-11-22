import { TestBed } from '@angular/core/testing';
import { AvisosService, DURACION_AVISO } from './avisos.service';

describe('AvisosService', () => {
  afterEach(() => vi.useRealTimers());

  it('muestra los avisos en orden y los quita al cerrarlos o al pasar el tiempo', () => {
    vi.useFakeTimers();
    const avisos = TestBed.inject(AvisosService);

    avisos.mostrar('Primero', 'Detalle');
    avisos.mostrar('Segundo');
    expect(avisos.avisos().map((aviso) => aviso.titulo)).toEqual(['Primero', 'Segundo']);
    expect(avisos.avisos()[1].detalle).toBeNull();

    avisos.cerrar(avisos.avisos()[0].id);
    expect(avisos.avisos().map((aviso) => aviso.titulo)).toEqual(['Segundo']);

    vi.advanceTimersByTime(DURACION_AVISO);
    expect(avisos.avisos()).toEqual([]);
  });

  it('los avisos son de éxito por defecto y los de error también desaparecen solos', () => {
    vi.useFakeTimers();
    const avisos = TestBed.inject(AvisosService);

    avisos.mostrar('Guardado');
    avisos.mostrar('No pudimos agregar el periodo.', 'Se superpone con otro periodo.', 'error');
    expect(avisos.avisos().map((aviso) => aviso.tipo)).toEqual(['exito', 'error']);

    vi.advanceTimersByTime(DURACION_AVISO);
    expect(avisos.avisos()).toEqual([]);
  });
});
