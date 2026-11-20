import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { defer, finalize, map, repeat, takeWhile } from 'rxjs';
import { formatearFechaHora } from '../../../alojamiento/utils/formato';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import {
  ESTADOS_EXPORTACION_EN_CURSO,
  ExportacionReporte,
  FORMATOS_REPORTE,
  FormatoReporte,
  INTERVALO_CONSULTA_REPORTE,
  estadoExportacion,
  formatoReporte,
} from '../../models/reporte.models';
import { ReportesService } from '../../services/reportes.service';

const ERRORES_DESCARGA: Record<number, string> = {
  404: 'No encontramos el archivo de este reporte. Genera uno nuevo.',
  409: 'El reporte todavía no está listo.',
  410: 'El archivo de este reporte ya no está disponible. Genera uno nuevo.',
};

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.html',
  styleUrls: ['../../styles/pagina-administracion.css', './reportes.css'],
})
export class Reportes {
  private readonly servicio = inject(ReportesService);
  private readonly router = inject(Router);
  private readonly documento = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly idExportacion = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((parametros) => parametros.get('idExportacion') ?? ''),
    ),
    { initialValue: '' },
  );

  protected readonly formatos = FORMATOS_REPORTE;
  protected readonly formato = signal<FormatoReporte>('PDF');
  protected readonly solicitando = signal(false);
  protected readonly errorSolicitud = signal<string | null>(null);

  protected readonly consulta = rxResource({
    params: () => this.idExportacion() || undefined,
    stream: ({ params }) =>
      defer(() => this.servicio.consultar(params)).pipe(
        repeat({ delay: INTERVALO_CONSULTA_REPORTE }),
        takeWhile((exportacion) => ESTADOS_EXPORTACION_EN_CURSO.includes(exportacion.estado), true),
      ),
  });

  protected readonly exportacion = computed(() =>
    this.consulta.hasValue() ? (this.consulta.value() ?? null) : null,
  );

  protected readonly noEncontrada = computed(() => {
    const error = this.consulta.status() === 'error' ? this.consulta.error() : null;
    return error instanceof HttpErrorResponse && [400, 404].includes(error.status);
  });

  protected readonly errorConsulta = computed(() =>
    this.consulta.status() === 'error' && !this.noEncontrada()
      ? mensajeDeError(this.consulta.error(), 'No pudimos consultar el reporte.')
      : null,
  );

  protected readonly enCurso = computed(() => {
    const exportacion = this.exportacion();
    return exportacion !== null && ESTADOS_EXPORTACION_EN_CURSO.includes(exportacion.estado);
  });

  protected readonly descargando = linkedSignal({
    source: this.idExportacion,
    computation: () => false,
  });
  protected readonly errorDescarga = linkedSignal<string, string | null>({
    source: this.idExportacion,
    computation: () => null,
  });

  protected readonly estado = estadoExportacion;
  protected readonly nombreFormato = (formato: string) => formatoReporte(formato).nombre;
  protected readonly fechaHora = formatearFechaHora;

  protected elegir(formato: FormatoReporte): void {
    this.formato.set(formato);
  }

  protected generar(): void {
    if (this.solicitando()) {
      return;
    }
    this.solicitando.set(true);
    this.errorSolicitud.set(null);
    this.servicio
      .solicitar(this.formato())
      .pipe(
        finalize(() => this.solicitando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (exportacion) =>
          void this.router.navigate(['/administracion/reportes', exportacion.idExportacion]),
        error: (error: unknown) =>
          this.errorSolicitud.set(mensajeDeError(error, 'No pudimos solicitar el reporte.')),
      });
  }

  protected descargar(exportacion: ExportacionReporte): void {
    if (this.descargando()) {
      return;
    }
    this.descargando.set(true);
    this.errorDescarga.set(null);
    this.servicio
      .descargar(exportacion.idExportacion)
      .pipe(
        finalize(() => this.descargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (archivo) => this.guardar(archivo, exportacion),
        error: (error: unknown) =>
          this.errorDescarga.set(
            (error instanceof HttpErrorResponse && ERRORES_DESCARGA[error.status]) ||
              mensajeDeError(error, 'No pudimos descargar el reporte. Intenta de nuevo.'),
          ),
      });
  }

  private guardar(archivo: Blob, exportacion: ExportacionReporte): void {
    const url = URL.createObjectURL(archivo);
    const enlace = this.documento.createElement('a');
    enlace.href = url;
    enlace.download = `reporte-gestion-${exportacion.fechaSolicitud.slice(0, 10)}.${
      formatoReporte(exportacion.formato).extension
    }`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
