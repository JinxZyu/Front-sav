import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { formatearDia, noches } from '../../../disponibilidad/utils/fechas';
import { EstadoReserva } from '../../../reserva/components/estado-reserva/estado-reserva';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { GestionPublicacionesService } from '../../services/gestion-publicaciones.service';

@Component({
  selector: 'app-reservas-afectadas',
  imports: [EstadoReserva],
  templateUrl: './reservas-afectadas.html',
  styleUrl: './reservas-afectadas.css',
})
export class ReservasAfectadas {
  private readonly servicio = inject(GestionPublicacionesService);

  readonly idPublicacion = input.required<string>();

  protected readonly consulta = rxResource({
    params: () => this.idPublicacion(),
    stream: ({ params }) => this.servicio.reservasAfectadas(params),
  });

  protected readonly reservas = computed(() =>
    this.consulta.hasValue()
      ? [...this.consulta.value().reservas].sort((a, b) =>
          a.fechaEntrada.localeCompare(b.fechaEntrada),
        )
      : null,
  );

  protected readonly motivo = computed(
    () => this.reservas()?.find((reserva) => reserva.motivoBloqueo)?.motivoBloqueo ?? null,
  );

  protected readonly error = computed(() =>
    this.consulta.status() === 'error'
      ? mensajeDeError(this.consulta.error(), 'No pudimos consultar las reservas afectadas.')
      : null,
  );

  protected readonly dia = formatearDia;
  protected readonly noches = noches;
}
