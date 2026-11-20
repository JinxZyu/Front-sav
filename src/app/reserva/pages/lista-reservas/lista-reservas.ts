import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { TarjetaReserva } from '../../components/tarjeta-reserva/tarjeta-reserva';
import { ReservaService } from '../../services/reserva.service';

@Component({
  selector: 'app-lista-reservas',
  imports: [RouterLink, TarjetaReserva],
  templateUrl: './lista-reservas.html',
  styleUrl: './lista-reservas.css',
})
export class ListaReservas {
  private readonly servicio = inject(ReservaService);

  protected readonly consulta = rxResource({
    stream: () => this.servicio.misReservas(),
  });

  protected readonly reservas = computed(() =>
    this.consulta.hasValue() ? this.consulta.value().reservas : null,
  );

  protected readonly error = computed(() =>
    this.consulta.status() === 'error'
      ? mensajeDeError(this.consulta.error(), 'No pudimos consultar tus reservas.')
      : null,
  );
}
