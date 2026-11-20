import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UsuarioAdministrado } from '../models/usuario-administrado.models';

@Injectable({ providedIn: 'root' })
export class GestionUsuariosService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/administracion/usuarios`;

  listar(): Observable<UsuarioAdministrado[]> {
    return this.http.get<UsuarioAdministrado[]>(this.api);
  }

  restringir(idUsuario: string, motivo: string): Observable<string> {
    return this.http.patch(
      `${this.api}/${encodeURIComponent(idUsuario)}/restringir`,
      { motivo },
      { responseType: 'text' },
    );
  }

  levantarRestriccion(idUsuario: string): Observable<string> {
    return this.http.patch(
      `${this.api}/${encodeURIComponent(idUsuario)}/levantar-restriccion`,
      null,
      { responseType: 'text' },
    );
  }
}
