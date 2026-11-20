import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CancelacionReserva,
  Cotizacion,
  DecisionReserva,
  MisReservas,
  PagoReserva,
  ReservaDeAlojamiento,
  ReservaPropia,
  ReservasDeAlojamientos,
  RetencionReserva,
  SolicitudCotizacion,
  SolicitudReserva,
} from '../models/reserva.models';

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/reservas`;
  private readonly clavesSolicitud = new Map<string, string>();
  private readonly clavesPago = new Map<string, string>();

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

  pagar(idReserva: string): Observable<PagoReserva> {
    const clave = this.clave(this.clavesPago, idReserva);
    return this.http
      .post<PagoReserva>(`${this.ruta(idReserva)}/pago-simulado`, null, {
        headers: idempotencia(clave),
      })
      .pipe(
        tap((pago) => {
          if (pago.estadoPago !== 'PENDIENTE') {
            this.clavesPago.delete(idReserva);
          }
        }),
      );
  }

  misReservas(): Observable<MisReservas> {
    return this.http.get<MisReservas>(`${this.api}/mis-reservas`);
  }

  miReserva(idReserva: string): Observable<ReservaPropia> {
    return this.http.get<ReservaPropia>(
      `${this.api}/mis-reservas/${encodeURIComponent(idReserva)}`,
    );
  }

  cancelar(idReserva: string, motivo: string): Observable<CancelacionReserva> {
    return this.http.post<CancelacionReserva>(`${this.ruta(idReserva)}/cancelacion`, { motivo });
  }

  reservasDeMisAlojamientos(): Observable<ReservasDeAlojamientos> {
    return this.http.get<ReservasDeAlojamientos>(`${this.api}/mis-alojamientos`);
  }

  reservaDeMiAlojamiento(idReserva: string): Observable<ReservaDeAlojamiento> {
    return this.http.get<ReservaDeAlojamiento>(
      `${this.api}/mis-alojamientos/${encodeURIComponent(idReserva)}`,
    );
  }

  decidir(idReserva: string, aprobar: boolean): Observable<DecisionReserva> {
    const accion = aprobar ? 'aprobar' : 'rechazar';
    return this.http.patch<DecisionReserva>(`${this.ruta(idReserva)}/${accion}`, null);
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
