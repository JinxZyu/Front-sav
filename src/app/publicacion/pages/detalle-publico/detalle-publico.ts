import { TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ImagenPublicacion } from '../../../alojamiento/components/imagen-publicacion/imagen-publicacion';
import { formatearPorcentaje } from '../../../alojamiento/models/alojamiento.models';
import { formatearEspacios, formatearPesos } from '../../../alojamiento/utils/formato';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { CatalogoService } from '../../services/catalogo.service';

const DISPOSICIONES_GALERIA = [5, 3, 2, 1];

@Component({
  selector: 'app-detalle-publico',
  imports: [RouterLink, TitleCasePipe, ImagenPublicacion],
  templateUrl: './detalle-publico.html',
  styleUrl: './detalle-publico.css',
})
export class DetallePublico {
  private readonly servicio = inject(CatalogoService);
  private readonly ruta = inject(ActivatedRoute);

  private readonly idPublicacion = toSignal(
    this.ruta.paramMap.pipe(map((parametros) => parametros.get('idPublicacion') ?? '')),
    { initialValue: '' },
  );

  protected readonly consulta = rxResource({
    params: () => this.idPublicacion() || undefined,
    stream: ({ params }) => this.servicio.detalle(params),
  });

  protected readonly datos = computed(() =>
    this.consulta.hasValue() ? this.consulta.value() : null,
  );

  protected readonly imagenes = computed(() => {
    const imagenes = [...(this.datos()?.publicacion.imagenes ?? [])];
    imagenes.sort((a, b) => Number(b.esPortada) - Number(a.esPortada) || a.orden - b.orden);
    const cantidad = DISPOSICIONES_GALERIA.find((opcion) => imagenes.length >= opcion) ?? 0;
    return imagenes.slice(0, cantidad);
  });

  protected readonly noEncontrada = computed(() => {
    const error = this.consulta.status() === 'error' ? this.consulta.error() : null;
    return error instanceof HttpErrorResponse && [400, 404].includes(error.status);
  });

  protected readonly error = computed(() =>
    this.consulta.status() === 'error' && !this.noEncontrada()
      ? mensajeDeError(this.consulta.error(), 'No pudimos cargar el alojamiento.')
      : null,
  );

  protected readonly pesos = formatearPesos;
  protected readonly porcentaje = formatearPorcentaje;
  protected readonly espacios = formatearEspacios;
}
