import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AutenticacionResponse } from '../../config/auth/sesion.models';
import { CredencialesRequest, RegistroRequest } from '../models/usuario.models';

@Injectable({ providedIn: 'root' })
export class AutenticacionService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  registrar(datos: RegistroRequest): Observable<string> {
    return this.http.post(`${this.api}/autenticacion/registrar`, datos, { responseType: 'text' });
  }

  confirmarCodigo(correo: string, codigo: string): Observable<string> {
    const params = new HttpParams().set('correo', correo).set('codigo', codigo);
    return this.http.post(`${this.api}/verificacion-correo/confirmar`, null, {
      params,
      responseType: 'text',
    });
  }

  reenviarCodigo(correo: string): Observable<string> {
    const params = new HttpParams().set('correo', correo);
    return this.http.post(`${this.api}/verificacion-correo/reenviar`, null, {
      params,
      responseType: 'text',
    });
  }

  iniciarSesion(credenciales: CredencialesRequest): Observable<AutenticacionResponse> {
    return this.http.post<AutenticacionResponse>(`${this.api}/autenticacion/login`, credenciales);
  }

  reactivarCuenta(credenciales: CredencialesRequest): Observable<string> {
    return this.http.post(`${this.api}/autenticacion/reactivar`, credenciales, {
      responseType: 'text',
    });
  }
}
