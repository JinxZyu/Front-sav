import { Component, computed, input } from '@angular/core';
import { formatearPesos } from '../../../alojamiento/utils/formato';
import { formatearDia, noches } from '../../../disponibilidad/utils/fechas';

@Component({
  selector: 'app-resumen-reserva',
  templateUrl: './resumen-reserva.html',
  styleUrl: './resumen-reserva.css',
})
export class ResumenReserva {
  readonly fechaEntrada = input.required<string>();
  readonly fechaSalida = input.required<string>();
  readonly monto = input.required<number>();
  readonly filas = input<{ etiqueta: string; valor: string }[]>([]);

  protected readonly noches = computed(() => noches(this.fechaEntrada(), this.fechaSalida()));
  protected readonly dia = formatearDia;
  protected readonly pesos = formatearPesos;
}
