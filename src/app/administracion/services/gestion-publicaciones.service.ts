import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DecisionPublicacion,
  ModeracionPublicacion,
  PublicacionParaRevision,
  PublicacionAdministrada,
  ReservasAfectadas,
} from '../models/publicacion-administrada.models';

@Injectable({ providedIn: 'root' })
export class GestionPublicacionesService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/administracion/publicaciones`;

  listar(): Observable<PublicacionAdministrada[]> {
    return this.http.get<PublicacionAdministrada[]>(this.api);
  }

  detalle(idPublicacion: string): Observable<PublicacionParaRevision> {
    return this.http.get<PublicacionParaRevision>(this.ruta(idPublicacion));
  }

  aprobar(idPublicacion: string): Observable<DecisionPublicacion> {
    return this.http.patch<DecisionPublicacion>(`${this.ruta(idPublicacion)}/aprobar`, null);
  }

  rechazar(idPublicacion: string, motivo: string): Observable<DecisionPublicacion> {
    return this.http.patch<DecisionPublicacion>(`${this.ruta(idPublicacion)}/rechazar`, {
      motivo,
    });
  }

  bloquear(idPublicacion: string, motivo: string): Observable<ModeracionPublicacion> {
    return this.http.patch<ModeracionPublicacion>(`${this.ruta(idPublicacion)}/bloquear`, {
      motivo,
    });
  }

  desbloquear(idPublicacion: string, motivo: string): Observable<ModeracionPublicacion> {
    return this.http.patch<ModeracionPublicacion>(`${this.ruta(idPublicacion)}/desbloquear`, {
      motivo,
    });
  }

  reservasAfectadas(idPublicacion: string): Observable<ReservasAfectadas> {
    return this.http.get<ReservasAfectadas>(`${this.ruta(idPublicacion)}/reservas-afectadas`);
  }

  private ruta(idPublicacion: string): string {
    return `${this.api}/${encodeURIComponent(idPublicacion)}`;
  }
}
