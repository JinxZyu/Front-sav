import { TestBed } from '@angular/core/testing';
import { BarrasIndicador } from './barras-indicador';

describe('BarrasIndicador', () => {
  it('dibuja cada barra proporcional al mayor valor y muestra su número', () => {
    const fixture = TestBed.createComponent(BarrasIndicador);
    fixture.componentRef.setInput('unidad', 'reservas');
    fixture.componentRef.setInput('barras', [
      { etiqueta: 'Confirmada', valor: 1200 },
      { etiqueta: 'Cancelada', valor: 300 },
      { etiqueta: 'Vencida', valor: 0 },
    ]);
    fixture.detectChanges();

    const filas = [...(fixture.nativeElement as HTMLElement).querySelectorAll('li')];
    expect(filas.map((fila) => fila.querySelector('.etiqueta')?.textContent)).toEqual([
      'Confirmada',
      'Cancelada',
      'Vencida',
    ]);
    expect(filas[0].querySelector('.valor')?.textContent).toBe('1.200');
    expect((filas[0].querySelector('.relleno') as HTMLElement).style.width).toBe('100%');
    expect((filas[1].querySelector('.relleno') as HTMLElement).style.width).toBe('25%');
    expect(filas[2].querySelector('.relleno')).toBeNull();
    expect(filas[1].getAttribute('title')).toBe('Cancelada: 300 reservas');
  });

  it('no divide por cero cuando todo está en cero', () => {
    const fixture = TestBed.createComponent(BarrasIndicador);
    fixture.componentRef.setInput('unidad', 'reservas');
    fixture.componentRef.setInput('barras', [{ etiqueta: 'Confirmada', valor: 0 }]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.valor')?.textContent).toBe('0');
  });
});
