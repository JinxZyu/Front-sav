import { Component, DestroyRef, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { EMPTY, catchError, switchMap, timer } from 'rxjs';
import { NotificacionService } from '../../services/notificacion.service';

const INTERVALO_MS = 60_000;

@Component({
  selector: 'app-campana-notificaciones',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './campana-notificaciones.html',
  styleUrl: './campana-notificaciones.css',
})
export class CampanaNotificaciones {
  private readonly servicio = inject(NotificacionService);

  protected readonly nuevas = this.servicio.nuevas;
  protected readonly contador = computed(() => (this.nuevas() > 9 ? '9+' : String(this.nuevas())));
  protected readonly etiqueta = computed(() => {
    const nuevas = this.nuevas();
    if (nuevas === 0) {
      return 'Notificaciones';
    }
    return `Notificaciones, ${nuevas} ${nuevas === 1 ? 'nueva' : 'nuevas'}`;
  });

  constructor() {
    const consulta = timer(0, INTERVALO_MS)
      .pipe(switchMap(() => this.servicio.misNotificaciones().pipe(catchError(() => EMPTY))))
      .subscribe();
    inject(DestroyRef).onDestroy(() => consulta.unsubscribe());
  }
}
