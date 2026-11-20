import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IndicadoresDashboard } from '../models/indicadores.models';

@Injectable({ providedIn: 'root' })
export class IndicadoresService {
  private readonly http = inject(HttpClient);

  consultar(): Observable<IndicadoresDashboard> {
    return this.http.get<IndicadoresDashboard>(
      `${environment.apiUrl}/administracion/dashboard/indicadores`,
    );
  }
}
