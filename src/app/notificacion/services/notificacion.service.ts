import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notificacion } from '../models/notificacion.models';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/notificaciones/mis-notificaciones`;

  misNotificaciones(): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>(this.url);
  }
}
