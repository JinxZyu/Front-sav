import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ServicioDisponible } from '../../alojamiento/models/alojamiento.models';
import {
  FiltrosBusqueda,
  PaginaPublicaciones,
  PublicacionPublica,
  TAMANO_PAGINA,
} from '../models/catalogo.models';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  buscar(filtros: FiltrosBusqueda): Observable<PaginaPublicaciones> {
    let params = new HttpParams()
      .set('pagina', String(filtros.pagina))
      .set('tamano', String(TAMANO_PAGINA));
    const valores: [string, string][] = [
      ['ciudad', filtros.ciudad.trim()],
      ['fechaInicio', filtros.llegada],
      ['fechaFin', filtros.salida],
      ['capacidad', filtros.huespedes],
      ['tipoAlojamiento', filtros.tipo],
      ['precioMinimo', filtros.precioMinimo],
      ['precioMaximo', filtros.precioMaximo],
    ];
    for (const [nombre, valor] of valores) {
      if (valor) {
        params = params.set(nombre, valor);
      }
    }
    for (const servicio of filtros.servicios) {
      params = params.append('servicios', servicio);
    }
    return this.http.get<PaginaPublicaciones>(`${this.api}/publicaciones/busqueda`, { params });
  }

  detalle(idPublicacion: string): Observable<PublicacionPublica> {
    return this.http.get<PublicacionPublica>(
      `${this.api}/publicaciones/${encodeURIComponent(idPublicacion)}/detalle-publico`,
    );
  }

  servicios(): Observable<ServicioDisponible[]> {
    return this.http.get<ServicioDisponible[]>(`${this.api}/servicios`);
  }
}
