import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Paginador, paginar } from './paginador';

@Component({
  imports: [Paginador],
  template: `<app-paginador [total]="total()" [porPagina]="10" [(pagina)]="pagina" />`,
})
class Anfitrion {
  readonly total = signal(25);
  readonly pagina = signal(0);
}

describe('Paginador', () => {
  const crear = () => {
    const fixture = TestBed.createComponent(Anfitrion);
    fixture.detectChanges();
    return fixture;
  };
  const texto = (fixture: ReturnType<typeof crear>) =>
    (fixture.nativeElement as HTMLElement).querySelector('nav')?.textContent?.replace(/\s+/g, ' ').trim();
  const boton = (fixture: ReturnType<typeof crear>, nombre: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (actual) => actual.textContent?.trim() === nombre,
    ) as HTMLButtonElement;

  it('paginar devuelve solo los elementos de la página pedida', () => {
    const lista = Array.from({ length: 25 }, (_, indice) => indice);

    expect(paginar(lista, 0, 10)).toEqual(lista.slice(0, 10));
    expect(paginar(lista, 2, 10)).toEqual([20, 21, 22, 23, 24]);
    expect(paginar(lista, 3, 10)).toEqual([]);
  });

  it('con una sola página no muestra nada', () => {
    const fixture = crear();
    fixture.componentInstance.total.set(10);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('nav')).toBeNull();
  });

  it('muestra la página actual y avanza y retrocede', () => {
    const fixture = crear();
    expect(texto(fixture)).toBe('AnteriorPágina 1 de 3 Siguiente');
    expect(boton(fixture, 'Anterior').disabled).toBe(true);

    boton(fixture, 'Siguiente').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.pagina()).toBe(1);
    expect(texto(fixture)).toContain('Página 2 de 3');

    boton(fixture, 'Siguiente').click();
    fixture.detectChanges();
    expect(boton(fixture, 'Siguiente').disabled).toBe(true);

    boton(fixture, 'Anterior').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.pagina()).toBe(1);
  });

  it('si la lista se acorta vuelve a la última página que exista', () => {
    const fixture = crear();
    fixture.componentInstance.pagina.set(2);
    fixture.detectChanges();
    expect(texto(fixture)).toContain('Página 3 de 3');

    fixture.componentInstance.total.set(12);
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();

    expect(fixture.componentInstance.pagina()).toBe(1);
    expect(texto(fixture)).toContain('Página 2 de 2');
  });
});
