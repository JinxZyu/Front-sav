import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResumenPublicacion, estadoPublicacion } from '../../models/alojamiento.models';
import { formatearPesos } from '../../utils/formato';
import { ImagenPublicacion } from '../imagen-publicacion/imagen-publicacion';

@Component({
  selector: 'app-tarjeta-publicacion',
  imports: [RouterLink, ImagenPublicacion],
  templateUrl: './tarjeta-publicacion.html',
  styleUrl: './tarjeta-publicacion.css',
})
export class TarjetaPublicacion {
  readonly publicacion = input.required<ResumenPublicacion>();
  readonly enlace = input.required<string | readonly unknown[]>();
  readonly parametros = input<Record<string, string> | null>(null);
  readonly mostrarEstado = input(false);
  readonly detalle = input<string | null>(null);

  protected readonly estado = estadoPublicacion;
  protected readonly pesos = formatearPesos;
}
