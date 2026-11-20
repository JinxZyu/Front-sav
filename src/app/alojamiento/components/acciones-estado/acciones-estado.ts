import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { CambioEstadoPublicacion, DetallePublicacion } from '../../models/alojamiento.models';
import { PublicacionAlojamientoService } from '../../services/publicacion-alojamiento.service';
import { AvisosService } from '../../../shared/services/avisos.service';

@Component({
  selector: 'app-acciones-estado',
  imports: [RouterLink],
  templateUrl: './acciones-estado.html',
  styleUrl: './acciones-estado.css',
})
export class AccionesEstado {
  private readonly servicio = inject(PublicacionAlojamientoService);
  private readonly destruccion = inject(DestroyRef);
  private readonly avisos = inject(AvisosService);

  readonly publicacion = input.required<DetallePublicacion>();
  readonly cambio = output<string>();

  readonly procesando = signal(false);
  readonly error = signal<string | null>(null);
  readonly faltaInformacion = signal(false);

  enviarRevision(): void {
    this.ejecutar(
      this.servicio.enviarRevision(this.publicacion().idPublicacion),
      ['Publicación enviada a revisión', 'Te avisaremos cuando un administrador la revise.'],
      'No pudimos enviar la publicación a revisión.',
    );
  }

  pausar(): void {
    this.ejecutar(
      this.servicio.pausar(this.publicacion().idPublicacion),
      ['Publicación pausada', 'Ya no aparece en el marketplace.'],
      'No pudimos pausar la publicación.',
    );
  }

  reactivar(): void {
    this.ejecutar(
      this.servicio.reactivar(this.publicacion().idPublicacion),
      ['Publicación reactivada', 'Ya aparece de nuevo en el marketplace.'],
      'No pudimos reactivar la publicación.',
    );
  }

  private ejecutar(
    peticion: Observable<CambioEstadoPublicacion>,
    [titulo, detalle]: [string, string],
    falla: string,
  ): void {
    if (this.procesando()) {
      return;
    }
    this.error.set(null);
    this.faltaInformacion.set(false);
    this.procesando.set(true);
    peticion
      .pipe(
        finalize(() => this.procesando.set(false)),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe({
        next: (respuesta) => {
          this.avisos.mostrar(titulo, detalle);
          this.cambio.emit(respuesta.estadoActual);
        },
        error: (error: unknown) => {
          this.faltaInformacion.set(error instanceof HttpErrorResponse && error.status === 400);
          this.error.set(mensajeDeError(error, falla));
        },
      });
  }
}
