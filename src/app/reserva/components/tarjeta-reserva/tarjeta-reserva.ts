import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatearPesos } from '../../../alojamiento/utils/formato';
import { formatearDia, noches } from '../../../disponibilidad/utils/fechas';
import { EstadoReserva } from '../estado-reserva/estado-reserva';

@Component({
  selector: 'app-tarjeta-reserva',
  imports: [RouterLink, EstadoReserva],
  templateUrl: './tarjeta-reserva.html',
  styleUrl: './tarjeta-reserva.css',
})
export class TarjetaReserva {
  readonly enlace = input.required<string[]>();
  readonly titulo = input.required<string>();
  readonly detalle = input<string | null>(null);
  readonly fechaEntrada = input.required<string>();
  readonly fechaSalida = input.required<string>();
  readonly estado = input.required<string>();
  readonly monto = input.required<number>();

  protected readonly noches = computed(() => noches(this.fechaEntrada(), this.fechaSalida()));
  protected readonly dia = formatearDia;
  protected readonly pesos = formatearPesos;
}
