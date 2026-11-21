import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { SelectorDestino } from './selector-destino';

describe('SelectorDestino', () => {
  let fixture: ComponentFixture<SelectorDestino>;
  let control: FormControl<string>;

  const destinos = [
    { ciudad: 'Bogotá', pais: 'Colombia', total: 3 },
    { ciudad: 'Medellín', pais: 'Colombia', total: 1 },
    { ciudad: 'Lima', pais: 'Perú', total: 2 },
    { ciudad: 'Guatavita', pais: null, total: 1 },
  ];

  const crear = async (valor = '') => {
    control = new FormControl(valor, { nonNullable: true });
    fixture = TestBed.createComponent(SelectorDestino);
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('destinos', destinos);
    fixture.componentRef.setInput('idEntrada', 'destino');
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const entrada = () => elemento().querySelector('input') as HTMLInputElement;
  const opciones = () =>
    [...elemento().querySelectorAll('[role="option"]')].map((opcion) =>
      opcion.querySelector('.ciudad')?.textContent?.trim(),
    );
  const refrescar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const escribir = async (texto: string) => {
    entrada().value = texto;
    entrada().dispatchEvent(new Event('input'));
    await refrescar();
  };
  const tecla = async (key: string) => {
    const evento = new KeyboardEvent('keydown', { key, cancelable: true });
    entrada().dispatchEvent(evento);
    await refrescar();
    return evento;
  };

  it('al enfocar muestra los destinos con su país y cantidad de alojamientos', async () => {
    await crear();
    expect(entrada().getAttribute('aria-expanded')).toBe('false');

    entrada().dispatchEvent(new Event('focus'));
    await refrescar();

    expect(entrada().getAttribute('aria-expanded')).toBe('true');
    expect(entrada().getAttribute('aria-controls')).toBe('destino-opciones');
    expect(opciones()).toEqual(['Bogotá', 'Medellín', 'Lima', 'Guatavita']);
    const detalles = [...elemento().querySelectorAll('.detalle')].map((detalle) =>
      detalle.textContent?.trim(),
    );
    expect(detalles).toEqual([
      'Colombia · 3 alojamientos',
      'Colombia · 1 alojamiento',
      'Perú · 2 alojamientos',
      '1 alojamiento',
    ]);
  });

  it('filtra sin importar tildes ni mayúsculas', async () => {
    await crear();
    await escribir('MEDELLIN');

    expect(opciones()).toEqual(['Medellín']);
    expect(control.value).toBe('MEDELLIN');

    await escribir('cali');
    expect(elemento().querySelector('[role="listbox"]')).toBeNull();
    expect(entrada().getAttribute('aria-expanded')).toBe('false');
  });

  it('se recorre con las flechas y Enter elige el destino', async () => {
    await crear();
    entrada().dispatchEvent(new Event('focus'));
    await refrescar();

    await tecla('ArrowDown');
    await tecla('ArrowDown');
    expect(entrada().getAttribute('aria-activedescendant')).toBe('destino-opcion-1');
    expect(elemento().querySelector('#destino-opcion-1')?.getAttribute('aria-selected')).toBe(
      'true',
    );
    await tecla('ArrowUp');
    await tecla('ArrowUp');
    expect(entrada().getAttribute('aria-activedescendant')).toBe('destino-opcion-3');

    const enter = await tecla('Enter');

    expect(enter.defaultPrevented).toBe(true);
    expect(control.value).toBe('Guatavita');
    expect(control.dirty).toBe(true);
    expect(elemento().querySelector('[role="listbox"]')).toBeNull();
  });

  it('Enter sin destino resaltado deja enviar la búsqueda', async () => {
    await crear('Lima');
    entrada().dispatchEvent(new Event('focus'));
    await refrescar();

    expect(opciones()).toEqual(['Lima']);
    expect((await tecla('Enter')).defaultPrevented).toBe(false);
  });

  it('Escape y salir del campo cierran la lista', async () => {
    await crear();
    entrada().dispatchEvent(new Event('focus'));
    await refrescar();
    await tecla('Escape');
    expect(elemento().querySelector('[role="listbox"]')).toBeNull();

    await tecla('ArrowDown');
    expect(opciones()).toHaveLength(4);
    entrada().dispatchEvent(new Event('blur'));
    await refrescar();
    expect(elemento().querySelector('[role="listbox"]')).toBeNull();
  });

  it('con el mouse elige el destino sin perder el foco', async () => {
    await crear();
    entrada().dispatchEvent(new Event('click'));
    await refrescar();
    const lima = elemento().querySelectorAll<HTMLElement>('[role="option"]')[2];
    const presion = new MouseEvent('mousedown', { cancelable: true });
    lima.dispatchEvent(presion);
    lima.click();
    await refrescar();

    expect(presion.defaultPrevented).toBe(true);
    expect(control.value).toBe('Lima');
    expect(elemento().querySelector('[role="listbox"]')).toBeNull();
  });

  it('si el formulario cambia el destino por fuera, filtra con el valor nuevo', async () => {
    await crear('Medellín');
    entrada().dispatchEvent(new Event('focus'));
    await refrescar();
    expect(opciones()).toEqual(['Medellín']);

    control.setValue('Lima');
    await refrescar();

    expect(opciones()).toEqual(['Lima']);
  });

  it('con la lista cerrada, las flechas usan las opciones que se van a mostrar', async () => {
    await crear();
    control.setValue('Lima');
    await refrescar();

    await tecla('ArrowUp');
    expect(entrada().getAttribute('aria-activedescendant')).toBe('destino-opcion-0');
    await tecla('Enter');

    expect(control.value).toBe('Lima');
    expect(elemento().querySelector('[role="listbox"]')).toBeNull();
  });

  it('Enter sobre una opción también la elige', async () => {
    await crear();
    entrada().dispatchEvent(new Event('focus'));
    await refrescar();
    elemento()
      .querySelectorAll('[role="option"]')[1]
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await refrescar();

    expect(control.value).toBe('Medellín');
  });
});
