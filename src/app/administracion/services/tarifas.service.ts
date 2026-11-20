import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConfiguracionTarifa, NuevaConfiguracionTarifa } from '../models/tarifa.models';

@Injectable({ providedIn: 'root' })
export class TarifasService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/administracion/tarifas/configuracion-vigente`;

  vigente(): Observable<ConfiguracionTarifa> {
    return this.http.get<ConfiguracionTarifa>(this.api);
  }

  configurar(configuracion: NuevaConfiguracionTarifa): Observable<ConfiguracionTarifa> {
    return this.http.put<ConfiguracionTarifa>(this.api, configuracion);
  }
}
