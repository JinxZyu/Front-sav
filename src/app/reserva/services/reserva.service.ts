import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Cotizacion,
  MisReservas,
  ReservaPropia,
  SolicitudCotizacion,
} from '../models/reserva.models';

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/reservas`;

  cotizar(solicitud: SolicitudCotizacion): Observable<Cotizacion> {
    return this.http.post<Cotizacion>(`${environment.apiUrl}/cotizaciones`, solicitud);
  }

  misReservas(): Observable<MisReservas> {
    return this.http.get<MisReservas>(`${this.api}/mis-reservas`);
  }

  miReserva(idReserva: string): Observable<ReservaPropia> {
    return this.http.get<ReservaPropia>(
      `${this.api}/mis-reservas/${encodeURIComponent(idReserva)}`,
    );
  }
}
