import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cuenta } from '../models/usuario.models';

@Injectable({ providedIn: 'root' })
export class CuentaService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  consultar(): Observable<Cuenta> {
    return this.http.get<Cuenta>(`${this.api}/usuarios/mi_cuenta`);
  }
}
