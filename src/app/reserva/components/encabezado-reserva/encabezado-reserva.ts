import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvisoReserva } from '../../models/reserva.models';
import { EstadoReserva } from '../estado-reserva/estado-reserva';

@Component({
  selector: 'app-encabezado-reserva',
  imports: [RouterLink, EstadoReserva],
  templateUrl: './encabezado-reserva.html',
  styleUrl: './encabezado-reserva.css',
})
export class EncabezadoReserva {
  readonly volverA = input.required<string>();
  readonly textoVolver = input.required<string>();
  readonly titulo = input.required<string>();
  readonly estado = input<string | null>(null);
  readonly aviso = input<AvisoReserva | null>(null);
}
