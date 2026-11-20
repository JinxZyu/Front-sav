import { Component, computed, effect, inject, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { formatearFechaHora } from '../../../alojamiento/utils/formato';
import { SesionService } from '../../../config/auth/sesion.service';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { Notificacion } from '../../models/notificacion.models';
import { NotificacionService } from '../../services/notificacion.service';
import { EnlaceNotificacion, enlaceNotificacion } from '../../utils/enlace-notificacion';
import { mensajeLegible } from '../../utils/mensaje-notificacion';

@Component({
  selector: 'app-mis-notificaciones',
  imports: [RouterLink],
  templateUrl: './mis-notificaciones.html',
  styleUrl: './mis-notificaciones.css',
})
export class MisNotificaciones {
  private readonly servicio = inject(NotificacionService);
  private readonly rol = inject(SesionService).rol();
  private readonly vistasAntes = this.servicio.ultimaVista();

  protected readonly consulta = rxResource({ stream: () => this.servicio.misNotificaciones() });

  protected readonly notificaciones = computed(() =>
    this.consulta.hasValue() ? this.consulta.value() : null,
  );

  protected readonly error = computed(() =>
    this.consulta.status() === 'error'
      ? mensajeDeError(this.consulta.error(), 'No pudimos consultar tus notificaciones.')
      : null,
  );

  protected readonly mensaje = mensajeLegible;
  protected readonly fecha = formatearFechaHora;

  constructor() {
    effect(() => {
      const notificaciones = this.notificaciones();
      if (notificaciones) {
        untracked(() => this.servicio.marcarVistas(notificaciones));
      }
    });
  }

  protected nueva(notificacion: Notificacion): boolean {
    return this.servicio.esNueva(notificacion, this.vistasAntes);
  }

  protected enlace(notificacion: Notificacion): EnlaceNotificacion | null {
    return enlaceNotificacion(notificacion, this.rol);
  }
}
