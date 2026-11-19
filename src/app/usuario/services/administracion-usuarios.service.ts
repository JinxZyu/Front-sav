import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UsuarioAdministrado } from '../models/usuario.models';

@Injectable({ providedIn: 'root' })
export class AdministracionUsuariosService {
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

  reactivarBloqueo(correo: string): Observable<string> {
    return this.http.patch(`${this.api}/reactivar-bloqueo`, null, {
      params: new HttpParams().set('correo', correo),
      responseType: 'text',
    });
  }
}
