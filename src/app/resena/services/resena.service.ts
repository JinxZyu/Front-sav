import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NuevaResena, ResenaCreada, ResenasPublicacion } from '../models/resena.models';

@Injectable({ providedIn: 'root' })
export class ResenaService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  crear(idReserva: string, resena: NuevaResena): Observable<ResenaCreada> {
    return this.http.post<ResenaCreada>(
      `${this.api}/reservas/${encodeURIComponent(idReserva)}/resenas`,
      resena,
    );
  }

  dePublicacion(idPublicacion: string): Observable<ResenasPublicacion> {
    return this.http.get<ResenasPublicacion>(
      `${this.api}/publicaciones/${encodeURIComponent(idPublicacion)}/resenas`,
    );
  }
}
