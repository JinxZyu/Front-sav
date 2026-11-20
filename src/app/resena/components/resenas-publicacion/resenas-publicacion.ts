import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { formatearFecha } from '../../../alojamiento/utils/formato';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { ResenaService } from '../../services/resena.service';
import { Estrellas } from '../estrellas/estrellas';

const PROMEDIO = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

@Component({
  selector: 'app-resenas-publicacion',
  imports: [Estrellas],
  templateUrl: './resenas-publicacion.html',
  styleUrl: './resenas-publicacion.css',
})
export class ResenasPublicacion {
  private readonly servicio = inject(ResenaService);

  readonly idPublicacion = input.required<string>();

  protected readonly consulta = rxResource({
    params: () => this.idPublicacion(),
    stream: ({ params }) => this.servicio.dePublicacion(params),
  });

  protected readonly datos = computed(() =>
    this.consulta.hasValue() ? this.consulta.value() : null,
  );

  protected readonly error = computed(() =>
    this.consulta.status() === 'error'
      ? mensajeDeError(this.consulta.error(), 'No pudimos cargar las reseñas.')
      : null,
  );

  protected readonly fecha = formatearFecha;

  protected promedio(valor: number): string {
    return PROMEDIO.format(Number(valor));
  }
}
