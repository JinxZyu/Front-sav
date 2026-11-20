import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExportacionReporte, FormatoReporte } from '../models/reporte.models';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/administracion/reportes/exportaciones`;

  solicitar(formato: FormatoReporte): Observable<ExportacionReporte> {
    return this.http.post<ExportacionReporte>(this.api, { formato });
  }

  consultar(idExportacion: string): Observable<ExportacionReporte> {
    return this.http.get<ExportacionReporte>(`${this.api}/${idExportacion}`);
  }

  descargar(idExportacion: string): Observable<Blob> {
    return this.http.get(`${this.api}/${idExportacion}/archivo`, { responseType: 'blob' });
  }
}
