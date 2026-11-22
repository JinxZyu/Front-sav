import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IngresosAnfitrion } from '../models/ingresos-anfitrion.models';

@Injectable({ providedIn: 'root' })
export class IngresosAnfitrionService {
  private readonly http = inject(HttpClient);

  consultar(): Observable<IngresosAnfitrion> {
    return this.http.get<IngresosAnfitrion>(`${environment.apiUrl}/anfitrion/ingresos`);
  }
}
