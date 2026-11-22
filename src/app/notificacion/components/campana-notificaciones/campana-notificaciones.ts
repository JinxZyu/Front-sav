import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, filter, fromEvent, merge, switchMap, tap, timer } from 'rxjs';
import { formatearFechaHora } from '../../../alojamiento/utils/formato';
import { SesionService } from '../../../config/auth/sesion.service';
import { Notificacion } from '../../models/notificacion.models';
import { NotificacionService } from '../../services/notificacion.service';
import { EnlaceNotificacion, enlaceNotificacion } from '../../utils/enlace-notificacion';
import { mensajeLegible } from '../../utils/mensaje-notificacion';

const INTERVALO_MS = 15_000;
const MAXIMO_VISIBLES = 5;

@Component({
  selector: 'app-campana-notificaciones',
  imports: [RouterLink],
  templateUrl: './campana-notificaciones.html',
  styleUrl: './campana-notificaciones.css',
  host: {
    '(document:click)': 'cerrarSiEsAfuera($event)',
    '(document:keydown.escape)': 'cerrarConEscape()',
  },
})
export class CampanaNotificaciones {
  private readonly servicio = inject(NotificacionService);
  private readonly sesion = inject(SesionService);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly disparador = viewChild.required<ElementRef<HTMLButtonElement>>('disparador');

  protected readonly abierta = signal(false);
  protected readonly fallo = signal(false);
  private readonly vistasAntes = signal(0);
  private readonly recarga = new Subject<void>();

  protected readonly nuevas = this.servicio.nuevas;
  protected readonly contador = computed(() => (this.nuevas() > 9 ? '9+' : String(this.nuevas())));
  protected readonly etiqueta = computed(() => {
    const nuevas = this.nuevas();
    if (nuevas === 0) {
      return 'Notificaciones';
    }
    return `Notificaciones, ${nuevas} ${nuevas === 1 ? 'nueva' : 'nuevas'}`;
  });

  protected readonly recientes = computed(
    () => this.servicio.recientes()?.slice(0, MAXIMO_VISIBLES) ?? null,
  );
  protected readonly hayMas = computed(
    () => (this.servicio.recientes()?.length ?? 0) > MAXIMO_VISIBLES,
  );

  protected readonly mensaje = mensajeLegible;
  protected readonly fecha = formatearFechaHora;

  constructor() {
    // Los navegadores frenan los temporizadores de una pestaña en segundo plano: al volver a verla se consulta al instante.
    const alVolver = fromEvent(document, 'visibilitychange').pipe(
      filter(() => document.visibilityState === 'visible'),
    );
    const consulta = merge(
      timer(0, INTERVALO_MS),
      this.recarga,
      this.servicio.actualizacionPedida$,
      alVolver,
    )
      .pipe(
        switchMap(() =>
          this.servicio.misNotificaciones().pipe(
            tap(() => this.fallo.set(false)),
            catchError(() => {
              this.fallo.set(true);
              return EMPTY;
            }),
          ),
        ),
      )
      .subscribe();
    inject(DestroyRef).onDestroy(() => consulta.unsubscribe());
    effect(() => {
      const notificaciones = this.servicio.recientes();
      if (this.abierta() && notificaciones) {
        untracked(() => this.servicio.marcarVistas(notificaciones));
      }
    });
  }

  protected reintentar(): void {
    this.recarga.next();
  }

  protected alternar(): void {
    if (this.abierta()) {
      this.cerrar();
      return;
    }
    this.vistasAntes.set(this.servicio.ultimaVista());
    this.abierta.set(true);
  }

  protected cerrar(): void {
    this.abierta.set(false);
  }

  protected nueva(notificacion: Notificacion): boolean {
    return this.servicio.esNueva(notificacion, this.vistasAntes());
  }

  protected enlace(notificacion: Notificacion): EnlaceNotificacion | null {
    return enlaceNotificacion(notificacion, this.sesion.rol());
  }

  protected cerrarConEscape(): void {
    if (!this.abierta()) {
      return;
    }
    const enfocadoAdentro = this.elemento.nativeElement.contains(document.activeElement);
    this.cerrar();
    if (enfocadoAdentro) {
      this.disparador().nativeElement.focus();
    }
  }

  protected cerrarSiEsAfuera(evento: Event): void {
    if (!this.elemento.nativeElement.contains(evento.target as Node | null)) {
      this.cerrar();
    }
  }
}
