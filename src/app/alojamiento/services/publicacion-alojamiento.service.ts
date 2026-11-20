import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CambioEstadoPublicacion,
  DetallePublicacion,
  MisPublicaciones,
  NuevaPublicacion,
  PoliticaCancelacion,
  PublicacionCreada,
  ServicioDisponible,
} from '../models/alojamiento.models';

@Injectable({ providedIn: 'root' })
export class PublicacionAlojamientoService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  servicios(): Observable<ServicioDisponible[]> {
    return this.http.get<ServicioDisponible[]>(`${this.api}/servicios`);
  }

  politicas(): Observable<PoliticaCancelacion[]> {
    return this.http.get<PoliticaCancelacion[]>(`${this.api}/politicas-cancelacion/activas`);
  }

  crear(datos: NuevaPublicacion): Observable<PublicacionCreada> {
    return this.http.post<PublicacionCreada>(`${this.api}/alojamientos`, comoFormulario(datos));
  }

  editar(idPublicacion: string, datos: NuevaPublicacion): Observable<PublicacionCreada> {
    return this.http.put<PublicacionCreada>(
      `${this.api}/publicaciones/${encodeURIComponent(idPublicacion)}`,
      comoFormulario(datos),
    );
  }

  misPublicaciones(): Observable<MisPublicaciones> {
    return this.http.get<MisPublicaciones>(`${this.api}/publicaciones/mis-publicaciones`);
  }

  detalle(idPublicacion: string): Observable<DetallePublicacion> {
    return this.http.get<DetallePublicacion>(
      `${this.api}/publicaciones/mis-publicaciones/${encodeURIComponent(idPublicacion)}`,
    );
  }

  enviarRevision(idPublicacion: string): Observable<CambioEstadoPublicacion> {
    return this.http.patch<CambioEstadoPublicacion>(
      `${this.api}/publicaciones/${encodeURIComponent(idPublicacion)}/enviar-revision`,
      null,
    );
  }

  pausar(idPublicacion: string): Observable<CambioEstadoPublicacion> {
    return this.http.patch<CambioEstadoPublicacion>(
      `${this.api}/publicaciones/${encodeURIComponent(idPublicacion)}/pausar`,
      null,
    );
  }

  reactivar(idPublicacion: string): Observable<CambioEstadoPublicacion> {
    return this.http.patch<CambioEstadoPublicacion>(
      `${this.api}/publicaciones/${encodeURIComponent(idPublicacion)}/reactivar`,
      null,
    );
  }

  imagen(ruta: string): Observable<Blob> {
    const separador = ruta.startsWith('/') ? '' : '/';
    return this.http.get(`${this.api}${separador}${ruta}`, { responseType: 'blob' });
  }
}

function comoFormulario(datos: NuevaPublicacion): FormData {
  const formulario = new FormData();
  formulario.append('titulo', datos.titulo);
  formulario.append('descripcion', datos.descripcion);
  formulario.append('reglas', datos.reglas);
  formulario.append('ubicacion', datos.ubicacion);
  formulario.append('ciudad', datos.ciudad);
  formulario.append('tipoAlojamiento', datos.tipoAlojamiento);
  formulario.append('capacidad', String(datos.capacidad));
  formulario.append('precioPorNoche', String(datos.precioPorNoche));
  formulario.append('tarifaLimpieza', String(datos.tarifaLimpieza));
  formulario.append('modoAceptacion', datos.modoAceptacion);
  formulario.append('idPolitica', datos.idPolitica);
  for (const idServicio of datos.idsServicios) {
    formulario.append('idsServicios', idServicio);
  }
  for (const imagen of datos.imagenes) {
    formulario.append('imagenes', imagen, imagen.name);
  }
  return formulario;
}
