import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResenasPublicacion } from '../models/resena.models';

@Injectable({ providedIn: 'root' })
export class ResenaService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  dePublicacion(idPublicacion: string): Observable<ResenasPublicacion> {
    return this.http.get<ResenasPublicacion>(
      `${this.api}/publicaciones/${encodeURIComponent(idPublicacion)}/resenas`,
    );
  }
}
