import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Cotizacion,
  MisReservas,
  ReservaPropia,
  RetencionReserva,
  SolicitudCotizacion,
  SolicitudReserva,
} from '../models/reserva.models';

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/reservas`;
  private readonly clavesSolicitud = new Map<string, string>();

  cotizar(solicitud: SolicitudCotizacion): Observable<Cotizacion> {
    return this.http.post<Cotizacion>(`${environment.apiUrl}/cotizaciones`, solicitud);
  }

  solicitar(idCotizacion: string): Observable<SolicitudReserva> {
    const clave = this.clave(this.clavesSolicitud, idCotizacion);
    return this.http
      .post<SolicitudReserva>(this.api, { idCotizacion }, { headers: idempotencia(clave) })
      .pipe(tap(() => this.clavesSolicitud.delete(idCotizacion)));
  }

  retener(idReserva: string): Observable<RetencionReserva> {
    return this.http.post<RetencionReserva>(`${this.ruta(idReserva)}/retencion`, null);
  }

  misReservas(): Observable<MisReservas> {
    return this.http.get<MisReservas>(`${this.api}/mis-reservas`);
  }

  miReserva(idReserva: string): Observable<ReservaPropia> {
    return this.http.get<ReservaPropia>(
      `${this.api}/mis-reservas/${encodeURIComponent(idReserva)}`,
    );
  }

  private ruta(idReserva: string): string {
    return `${this.api}/${encodeURIComponent(idReserva)}`;
  }

  private clave(claves: Map<string, string>, referencia: string): string {
    const existente = claves.get(referencia);
    if (existente) {
      return existente;
    }
    const nueva = crypto.randomUUID();
    claves.set(referencia, nueva);
    return nueva;
  }
}

function idempotencia(clave: string): HttpHeaders {
  return new HttpHeaders({ 'Idempotency-Key': clave });
}
