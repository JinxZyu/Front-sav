import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { formatearFecha } from '../../../alojamiento/utils/formato';
import { Estrellas } from '../../../resena/components/estrellas/estrellas';
import { ResenaService } from '../../../resena/services/resena.service';
import { AvisosService } from '../../../shared/services/avisos.service';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { MAXIMO_MOTIVO_RESENA } from '../../models/resena-moderada.models';
import { ModeracionResenasService } from '../../services/moderacion-resenas.service';
import { FormularioMotivo } from '../formulario-motivo/formulario-motivo';

@Component({
  selector: 'app-moderacion-resenas',
  imports: [Estrellas, FormularioMotivo],
  templateUrl: './moderacion-resenas.html',
  styleUrl: './moderacion-resenas.css',
})
export class ModeracionResenas {
  private readonly resenas = inject(ResenaService);
  private readonly moderacion = inject(ModeracionResenasService);
  private readonly avisos = inject(AvisosService);

  readonly idPublicacion = input.required<string>();

  protected readonly consulta = rxResource({
    params: () => this.idPublicacion(),
    stream: ({ params }) => this.resenas.dePublicacion(params),
  });

  protected readonly lista = computed(() =>
    this.consulta.hasValue() ? this.consulta.value().resenas : null,
  );

  protected readonly error = computed(() =>
    this.consulta.status() === 'error'
      ? mensajeDeError(this.consulta.error(), 'No pudimos consultar las reseñas.')
      : null,
  );

  protected readonly ocultando = linkedSignal<string, string | null>({
    source: this.idPublicacion,
    computation: () => null,
  });
  protected readonly enviando = linkedSignal({
    source: this.idPublicacion,
    computation: () => false,
  });
  protected readonly errorAccion = linkedSignal<string, string | null>({
    source: this.idPublicacion,
    computation: () => null,
  });

  protected readonly maximoMotivo = MAXIMO_MOTIVO_RESENA;
  protected readonly fecha = formatearFecha;

  protected abrir(idResena: string): void {
    if (!this.enviando()) {
      this.errorAccion.set(null);
      this.ocultando.set(idResena);
    }
  }

  protected cerrar(): void {
    if (!this.enviando()) {
      this.errorAccion.set(null);
      this.ocultando.set(null);
    }
  }

  protected ocultar(idResena: string, motivo: string): void {
    if (this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.errorAccion.set(null);
    this.moderacion
      .ocultar(idResena, motivo)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.ocultando.set(null);
          this.avisos.mostrar('Reseña ocultada', respuesta.mensaje);
          this.consulta.reload();
        },
        error: (error: unknown) =>
          this.errorAccion.set(mensajeDeError(error, 'No pudimos ocultar la reseña.')),
      });
  }
}
