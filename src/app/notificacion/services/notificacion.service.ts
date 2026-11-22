import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { SesionService } from '../../config/auth/sesion.service';
import { environment } from '../../../environments/environment';
import { Notificacion } from '../models/notificacion.models';

const PREFIJO_VISTAS = 'marketplace.notificaciones.vistas.';

interface Recibidas {
  usuario: string;
  notificaciones: Notificacion[];
}

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SesionService);
  private readonly url = `${environment.apiUrl}/notificaciones/mis-notificaciones`;

  private readonly recibidas = signal<Recibidas | null>(null);
  private readonly vistas = signal<Record<string, number>>({});
  private consultasEnviadas = 0;
  private ultimaConsultaAplicada = 0;

  readonly recientes = computed(() => {
    const recibidas = this.recibidas();
    return recibidas && recibidas.usuario === this.usuario() ? recibidas.notificaciones : null;
  });

  readonly nuevas = computed(() => {
    const usuario = this.usuario();
    const recibidas = this.recibidas();
    if (!recibidas || recibidas.usuario !== usuario) {
      return 0;
    }
    const vistasHasta = this.vistas()[usuario] ?? 0;
    return recibidas.notificaciones.filter((notificacion) => esNueva(notificacion, vistasHasta))
      .length;
  });

  private readonly pedidas = new Subject<void>();

  /** Cada vez que alguien pide revisar ya mismo si hay notificaciones nuevas (sin esperar la próxima consulta). */
  readonly actualizacionPedida$ = this.pedidas.asObservable();

  /** Para cuando la pantalla sabe que acaba de pasar algo que genera una notificación, como un reporte listo. */
  pedirActualizacion(): void {
    this.pedidas.next();
  }

  misNotificaciones(): Observable<Notificacion[]> {
    const usuario = this.usuario();
    const orden = ++this.consultasEnviadas;
    return this.http.get<Notificacion[]>(this.url).pipe(
      tap((notificaciones) => {
        if (orden < this.ultimaConsultaAplicada) {
          return;
        }
        this.ultimaConsultaAplicada = orden;
        this.recordar(usuario, leerGuardadas(usuario));
        this.recibidas.set({ usuario, notificaciones });
      }),
    );
  }

  esNueva(notificacion: Notificacion, vistasHasta: number): boolean {
    return esNueva(notificacion, vistasHasta);
  }

  ultimaVista(): number {
    const usuario = this.usuario();
    return Math.max(this.vistas()[usuario] ?? 0, leerGuardadas(usuario));
  }

  marcarVistas(notificaciones: Notificacion[]): void {
    const usuario = this.usuario();
    const masReciente = Math.max(0, ...notificaciones.map(instante));
    const vistasHasta = Math.max(this.ultimaVista(), masReciente);
    this.recordar(usuario, vistasHasta);
    try {
      localStorage.setItem(PREFIJO_VISTAS + usuario, String(vistasHasta));
    } catch {
      return;
    }
  }

  private recordar(usuario: string, vistasHasta: number): void {
    this.vistas.update((vistas) => ({
      ...vistas,
      [usuario]: Math.max(vistas[usuario] ?? 0, vistasHasta),
    }));
  }

  private usuario(): string {
    return this.sesion.correo() ?? '';
  }
}

function instante(notificacion: Notificacion): number {
  const valor = new Date(notificacion.fechaCreacion).getTime();
  return Number.isNaN(valor) ? 0 : valor;
}

function esNueva(notificacion: Notificacion, vistasHasta: number): boolean {
  return instante(notificacion) > vistasHasta;
}

function leerGuardadas(usuario: string): number {
  try {
    const valor = Number(localStorage.getItem(PREFIJO_VISTAS + usuario));
    return Number.isFinite(valor) ? valor : 0;
  } catch {
    return 0;
  }
}
