import { Component, computed, effect, input, model } from '@angular/core';

/** Devuelve solo los elementos de la página indicada (la primera es la 0). */
export function paginar<T>(elementos: readonly T[], pagina: number, porPagina: number): T[] {
  return elementos.slice(pagina * porPagina, (pagina + 1) * porPagina);
}

/**
 * Controles "Anterior / Página X de Y / Siguiente" para listas que ya están completas en el navegador.
 * Si hay una sola página no muestra nada.
 */
@Component({
  selector: 'app-paginador',
  templateUrl: './paginador.html',
  styleUrl: './paginador.css',
})
export class Paginador {
  readonly total = input.required<number>();
  readonly porPagina = input(10);
  readonly etiqueta = input('Páginas');
  /** Página actual, empezando en 0. Se puede enlazar con [(pagina)]. */
  readonly pagina = model(0);

  protected readonly totalPaginas = computed(() => Math.ceil(this.total() / this.porPagina()));

  constructor() {
    // Si la lista se acorta (por ejemplo al filtrar), no se puede quedar en una página que ya no existe.
    effect(() => {
      const ultima = Math.max(0, this.totalPaginas() - 1);
      if (this.pagina() > ultima) {
        this.pagina.set(ultima);
      }
    });
  }

  protected irA(pagina: number): void {
    this.pagina.set(Math.min(Math.max(0, pagina), this.totalPaginas() - 1));
  }
}
