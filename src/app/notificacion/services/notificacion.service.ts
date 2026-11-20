import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { SesionService } from '../../config/auth/sesion.service';
import { environment } from '../../../environments/environment';
import { Notificacion } from '../models/notificacion.models';

const PREFIJO_VISTAS = 'marketplace.notificaciones.vistas.';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SesionService);
  private readonly url = `${environment.apiUrl}/notificaciones/mis-notificaciones`;

  private readonly recibidas = signal<Notificacion[]>([]);
  private readonly vistasHasta = signal<number>(0);

  readonly nuevas = computed(
    () =>
      this.recibidas().filter(
        (notificacion) => new Date(notificacion.fechaCreacion).getTime() > this.vistasHasta(),
      ).length,
  );

  misNotificaciones(): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>(this.url).pipe(
      tap((notificaciones) => {
        this.vistasHasta.set(leerVistas(this.clave()));
        this.recibidas.set(notificaciones);
      }),
    );
  }

  esNueva(notificacion: Notificacion, vistasHasta: number): boolean {
    return new Date(notificacion.fechaCreacion).getTime() > vistasHasta;
  }

  ultimaVista(): number {
    return leerVistas(this.clave());
  }

  marcarVistas(): void {
    const ahora = Date.now();
    this.vistasHasta.set(ahora);
    try {
      localStorage.setItem(this.clave(), String(ahora));
    } catch {
      return;
    }
  }

  private clave(): string {
    return PREFIJO_VISTAS + (this.sesion.correo() ?? '');
  }
}

function leerVistas(clave: string): number {
  try {
    const valor = Number(localStorage.getItem(clave));
    return Number.isFinite(valor) ? valor : 0;
  } catch {
    return 0;
  }
}
