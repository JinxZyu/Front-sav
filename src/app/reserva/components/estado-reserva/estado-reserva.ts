import { Component, computed, input } from '@angular/core';
import { estadoReserva } from '../../models/reserva.models';

@Component({
  selector: 'app-estado-reserva',
  template: '{{ datos().etiqueta }}',
  styleUrl: './estado-reserva.css',
  host: { '[class]': 'datos().tono' },
})
export class EstadoReserva {
  readonly estado = input.required<string>();

  protected readonly datos = computed(() => estadoReserva(this.estado()));
}
