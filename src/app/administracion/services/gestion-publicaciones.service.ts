import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PublicacionPublica } from '../../publicacion/models/catalogo.models';
import {
  DecisionPublicacion,
  PublicacionAdministrada,
} from '../models/publicacion-administrada.models';

@Injectable({ providedIn: 'root' })
export class GestionPublicacionesService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/administracion/publicaciones`;

  listar(): Observable<PublicacionAdministrada[]> {
    return this.http.get<PublicacionAdministrada[]>(this.api);
  }

  detalle(idPublicacion: string): Observable<PublicacionPublica> {
    return this.http.get<PublicacionPublica>(this.ruta(idPublicacion));
  }

  aprobar(idPublicacion: string): Observable<DecisionPublicacion> {
    return this.http.patch<DecisionPublicacion>(`${this.ruta(idPublicacion)}/aprobar`, null);
  }

  rechazar(idPublicacion: string, motivo: string): Observable<DecisionPublicacion> {
    return this.http.patch<DecisionPublicacion>(`${this.ruta(idPublicacion)}/rechazar`, {
      motivo,
    });
  }

  private ruta(idPublicacion: string): string {
    return `${this.api}/${encodeURIComponent(idPublicacion)}`;
  }
}
