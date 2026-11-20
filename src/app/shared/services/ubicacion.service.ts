import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Ciudad, Pais } from '../models/ubicacion.models';

@Injectable({ providedIn: 'root' })
export class UbicacionService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/autenticacion/ubicaciones`;

  paises(): Observable<Pais[]> {
    return this.http
      .get<Pais[]>(`${this.api}/paises`)
      .pipe(map((paises) => ordenarPorNombre(paises.map(enEspanol))));
  }

  ciudades(idPais: string): Observable<Ciudad[]> {
    return this.http.get<Ciudad[]>(`${this.api}/paises/${encodeURIComponent(idPais)}/ciudades`);
  }
}

const NOMBRES_REGION = new Intl.DisplayNames(['es'], { type: 'region', fallback: 'none' });

function enEspanol(pais: Pais): Pais {
  const codigoIso2 = pais.codigoIso2.trim().toUpperCase();
  let nombre: string | undefined;
  try {
    nombre = NOMBRES_REGION.of(codigoIso2);
  } catch {
    nombre = undefined;
  }
  return { ...pais, codigoIso2, nombre: nombre ?? pais.nombre };
}

function ordenarPorNombre(paises: Pais[]): Pais[] {
  return [...paises].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
