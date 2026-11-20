import { Component, computed, input } from '@angular/core';
import { CALIFICACIONES } from '../../models/resena.models';

const NUMERO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

@Component({
  selector: 'app-estrellas',
  template: `
    @for (posicion of posiciones; track posicion) {
      <svg viewBox="0 0 24 24" aria-hidden="true" [class.llena]="posicion <= redondeado()">
        <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
      </svg>
    }
  `,
  styleUrl: './estrellas.css',
  host: { role: 'img', '[attr.aria-label]': 'etiqueta()' },
})
export class Estrellas {
  readonly valor = input.required<number>();

  protected readonly posiciones = CALIFICACIONES;
  protected readonly redondeado = computed(() => Math.round(Number(this.valor())));
  protected readonly etiqueta = computed(
    () => `${NUMERO.format(Number(this.valor()))} de 5 estrellas`,
  );
}
