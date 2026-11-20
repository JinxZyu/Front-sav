import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { TarjetaPublicacion } from '../../components/tarjeta-publicacion/tarjeta-publicacion';
import { PublicacionAlojamientoService } from '../../services/publicacion-alojamiento.service';
import { formatearFecha } from '../../utils/formato';

@Component({
  selector: 'app-mis-publicaciones',
  imports: [RouterLink, TarjetaPublicacion],
  templateUrl: './mis-publicaciones.html',
  styleUrl: './mis-publicaciones.css',
})
export class MisPublicaciones {
  private readonly servicio = inject(PublicacionAlojamientoService);

  protected readonly consulta = rxResource({
    stream: () => this.servicio.misPublicaciones(),
  });

  protected readonly publicaciones = computed(() =>
    this.consulta.hasValue() ? (this.consulta.value().publicaciones ?? []) : [],
  );

  protected readonly error = computed(() =>
    this.consulta.status() === 'error'
      ? mensajeDeError(this.consulta.error(), 'No pudimos consultar tus publicaciones.')
      : null,
  );

  protected readonly cargando = computed(
    () => this.consulta.isLoading() && !this.consulta.hasValue(),
  );

  protected readonly fecha = formatearFecha;

  reintentar(): void {
    this.consulta.reload();
  }
}
