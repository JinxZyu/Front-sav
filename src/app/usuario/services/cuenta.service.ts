import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SesionService } from '../../config/auth/sesion.service';
import { Cuenta } from '../models/usuario.models';

@Injectable({ providedIn: 'root' })
export class CuentaService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SesionService);
  private readonly api = environment.apiUrl;

  readonly actual = rxResource({
    params: () => this.sesion.token() ?? undefined,
    stream: () => this.consultar(),
  });

  consultar(): Observable<Cuenta> {
    return this.http.get<Cuenta>(`${this.api}/usuarios/mi_cuenta`);
  }
}
