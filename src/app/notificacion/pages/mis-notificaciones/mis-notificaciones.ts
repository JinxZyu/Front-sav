import { Component, computed, effect, inject, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { formatearFechaHora } from '../../../alojamiento/utils/formato';
import { SesionService } from '../../../config/auth/sesion.service';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { Notificacion } from '../../models/notificacion.models';
import { NotificacionService } from '../../services/notificacion.service';
import { mensajeLegible } from '../../utils/mensaje-notificacion';

interface Enlace {
  ruta: string[];
  texto: string;
}

@Component({
  selector: 'app-mis-notificaciones',
  imports: [RouterLink],
  templateUrl: './mis-notificaciones.html',
  styleUrl: './mis-notificaciones.css',
})
export class MisNotificaciones {
  private readonly servicio = inject(NotificacionService);
  private readonly anfitrion = inject(SesionService).tieneRol('ANFITRION');
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
      if (this.notificaciones()) {
        untracked(() => this.servicio.marcarVistas());
      }
    });
  }

  protected nueva(notificacion: Notificacion): boolean {
    return this.servicio.esNueva(notificacion, this.vistasAntes);
  }

  protected enlace(notificacion: Notificacion): Enlace | null {
    if (notificacion.idReserva) {
      return {
        ruta: this.anfitrion
          ? ['/reservas/alojamientos', notificacion.idReserva]
          : ['/reservas', notificacion.idReserva],
        texto: 'Ver reserva',
      };
    }
    if (notificacion.idPublicacion) {
      return {
        ruta: this.anfitrion
          ? ['/alojamientos', notificacion.idPublicacion]
          : ['/publicaciones', notificacion.idPublicacion],
        texto: 'Ver publicación',
      };
    }
    return null;
  }
}
