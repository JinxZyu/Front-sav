import { Component, computed, input } from '@angular/core';
import { BarraIndicador } from '../../models/indicadores.models';

const NUMERO = new Intl.NumberFormat('es-CO');

@Component({
  selector: 'app-barras-indicador',
  templateUrl: './barras-indicador.html',
  styleUrl: './barras-indicador.css',
})
export class BarrasIndicador {
  readonly barras = input.required<BarraIndicador[]>();
  readonly unidad = input.required<string>();

  protected readonly maximo = computed(() =>
    Math.max(1, ...this.barras().map((barra) => barra.valor)),
  );

  protected ancho(valor: number): string {
    return `${(valor / this.maximo()) * 100}%`;
  }

  protected numero(valor: number): string {
    return NUMERO.format(valor);
  }
}
