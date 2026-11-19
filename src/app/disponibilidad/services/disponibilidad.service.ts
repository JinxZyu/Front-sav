import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NuevoPeriodo, PeriodoDisponible } from '../models/disponibilidad.models';

@Injectable({ providedIn: 'root' })
export class DisponibilidadService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/alojamientos`;

  periodos(idAlojamiento: string): Observable<PeriodoDisponible[]> {
    return this.http.get<PeriodoDisponible[]>(this.urlPeriodos(idAlojamiento));
  }

  crearPeriodo(idAlojamiento: string, periodo: NuevoPeriodo): Observable<PeriodoDisponible> {
    return this.http.post<PeriodoDisponible>(this.urlPeriodos(idAlojamiento), periodo);
  }

  actualizarPeriodo(
    idAlojamiento: string,
    idPeriodo: string,
    periodo: NuevoPeriodo,
  ): Observable<PeriodoDisponible> {
    return this.http.put<PeriodoDisponible>(
      `${this.urlPeriodos(idAlojamiento)}/${encodeURIComponent(idPeriodo)}`,
      periodo,
    );
  }

  deshabilitarPeriodo(idAlojamiento: string, idPeriodo: string): Observable<PeriodoDisponible> {
    return this.http.delete<PeriodoDisponible>(
      `${this.urlPeriodos(idAlojamiento)}/${encodeURIComponent(idPeriodo)}`,
    );
  }

  private urlPeriodos(idAlojamiento: string): string {
    return `${this.api}/${encodeURIComponent(idAlojamiento)}/periodos-disponibles`;
  }
}
