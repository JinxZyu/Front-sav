import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResenaOcultada } from '../models/resena-moderada.models';

@Injectable({ providedIn: 'root' })
export class ModeracionResenasService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/administracion/resenas`;

  ocultar(idResena: string, motivo: string): Observable<ResenaOcultada> {
    return this.http.patch<ResenaOcultada>(`${this.api}/${encodeURIComponent(idResena)}/ocultar`, {
      motivo,
    });
  }
}
