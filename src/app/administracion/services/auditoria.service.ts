import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FiltrosAuditoria,
  PaginaAuditoria,
  TAMANO_PAGINA_AUDITORIA,
} from '../models/auditoria.models';

function inicioDelDia(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toISOString();
}

function finDelDia(fecha: string): string {
  return new Date(`${fecha}T23:59:59.999`).toISOString();
}

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/administracion/auditoria/eventos`;

  consultar(filtros: FiltrosAuditoria, pagina: number): Observable<PaginaAuditoria> {
    let params = new HttpParams().set('pagina', pagina).set('tamano', TAMANO_PAGINA_AUDITORIA);
    if (filtros.idUsuario) {
      params = params.set('idUsuario', filtros.idUsuario);
    }
    if (filtros.entidad) {
      params = params.set('entidadAfectada', filtros.entidad);
    }
    if (filtros.resultado) {
      params = params.set('resultado', filtros.resultado);
    }
    if (filtros.desde) {
      params = params.set('desde', inicioDelDia(filtros.desde));
    }
    if (filtros.hasta) {
      params = params.set('hasta', finDelDia(filtros.hasta));
    }
    return this.http.get<PaginaAuditoria>(this.api, { params });
  }
}
