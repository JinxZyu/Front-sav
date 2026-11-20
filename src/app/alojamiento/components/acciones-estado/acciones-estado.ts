import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { CambioEstadoPublicacion, DetallePublicacion } from '../../models/alojamiento.models';
import { PublicacionAlojamientoService } from '../../services/publicacion-alojamiento.service';

@Component({
  selector: 'app-acciones-estado',
  imports: [RouterLink],
  templateUrl: './acciones-estado.html',
  styleUrl: './acciones-estado.css',
})
export class AccionesEstado {
  private readonly servicio = inject(PublicacionAlojamientoService);
  private readonly destruccion = inject(DestroyRef);

  readonly publicacion = input.required<DetallePublicacion>();
  readonly cambio = output<string>();

  readonly procesando = signal(false);
  readonly aviso = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly faltaInformacion = signal(false);

  enviarRevision(): void {
    this.ejecutar(
      this.servicio.enviarRevision(this.publicacion().idPublicacion),
      'Enviamos tu publicación a revisión. Te avisaremos cuando un administrador la revise.',
      'No pudimos enviar la publicación a revisión.',
    );
  }

  pausar(): void {
    this.ejecutar(
      this.servicio.pausar(this.publicacion().idPublicacion),
      'Pausamos tu publicación. Ya no aparece en el marketplace.',
      'No pudimos pausar la publicación.',
    );
  }

  reactivar(): void {
    this.ejecutar(
      this.servicio.reactivar(this.publicacion().idPublicacion),
      'Reactivamos tu publicación. Ya aparece de nuevo en el marketplace.',
      'No pudimos reactivar la publicación.',
    );
  }

  private ejecutar(
    peticion: Observable<CambioEstadoPublicacion>,
    exito: string,
    falla: string,
  ): void {
    if (this.procesando()) {
      return;
    }
    this.aviso.set(null);
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
          this.aviso.set(exito);
          this.cambio.emit(respuesta.estadoActual);
        },
        error: (error: unknown) => {
          this.faltaInformacion.set(error instanceof HttpErrorResponse && error.status === 400);
          this.error.set(mensajeDeError(error, falla));
        },
      });
  }
}
