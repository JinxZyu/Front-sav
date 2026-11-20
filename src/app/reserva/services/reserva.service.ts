import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cotizacion, SolicitudCotizacion } from '../models/reserva.models';

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private readonly http = inject(HttpClient);

  cotizar(solicitud: SolicitudCotizacion): Observable<Cotizacion> {
    return this.http.post<Cotizacion>(`${environment.apiUrl}/cotizaciones`, solicitud);
  }
}
