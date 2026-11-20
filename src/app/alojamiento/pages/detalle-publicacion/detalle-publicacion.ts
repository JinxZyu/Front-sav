import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { AccionesEstado } from '../../components/acciones-estado/acciones-estado';
import { ImagenPublicacion } from '../../components/imagen-publicacion/imagen-publicacion';
import { ModoAceptacionPublicacion } from '../../components/modo-aceptacion-publicacion/modo-aceptacion-publicacion';
import { PoliticaPublicacion } from '../../components/politica-publicacion/politica-publicacion';
import { TarifasPublicacion } from '../../components/tarifas-publicacion/tarifas-publicacion';
import {
  DetallePublicacion as DatosPublicacion,
  estadoPublicacion,
  modoAceptacion,
  motivoSinEdicion,
} from '../../models/alojamiento.models';
import { PublicacionAlojamientoService } from '../../services/publicacion-alojamiento.service';
import { formatearEspacios, formatearFecha, formatearPesos } from '../../utils/formato';

@Component({
  selector: 'app-detalle-publicacion',
  imports: [
    RouterLink,
    ImagenPublicacion,
    AccionesEstado,
    PoliticaPublicacion,
    TarifasPublicacion,
    ModoAceptacionPublicacion,
  ],
  templateUrl: './detalle-publicacion.html',
  styleUrl: './detalle-publicacion.css',
})
export class DetallePublicacion {
  private readonly servicio = inject(PublicacionAlojamientoService);

  private readonly ruta = inject(ActivatedRoute);

  private readonly idPublicacion = toSignal(
    this.ruta.paramMap.pipe(map((parametros) => parametros.get('idPublicacion') ?? '')),
    { initialValue: '' },
  );

  protected readonly actualizada = toSignal(
    this.ruta.queryParamMap.pipe(map((parametros) => parametros.get('aviso') === 'actualizada')),
    { initialValue: false },
  );

  protected readonly consulta = rxResource({
    params: () => this.idPublicacion() || undefined,
    stream: ({ params }) => this.servicio.detalle(params),
  });

  protected readonly publicacion = computed(() =>
    this.consulta.hasValue() ? this.consulta.value() : null,
  );

  protected readonly imagenes = computed(() => {
    const imagenes = [...(this.publicacion()?.imagenes ?? [])];
    return imagenes.sort((a, b) => Number(b.esPortada) - Number(a.esPortada) || a.orden - b.orden);
  });

  protected readonly noEncontrada = computed(() => {
    const error = this.consulta.status() === 'error' ? this.consulta.error() : null;
    return error instanceof HttpErrorResponse && [400, 403, 404].includes(error.status);
  });

  protected readonly error = computed(() =>
    this.consulta.status() === 'error' && !this.noEncontrada()
      ? mensajeDeError(this.consulta.error(), 'No pudimos consultar la publicación.')
      : null,
  );

  protected readonly editable = computed(() => {
    const publicacion = this.publicacion();
    return !!publicacion && motivoSinEdicion(publicacion.estado) === null;
  });

  protected readonly estado = estadoPublicacion;
  protected readonly modo = modoAceptacion;
  protected readonly pesos = formatearPesos;
  protected readonly fecha = formatearFecha;
  protected readonly espacios = formatearEspacios;

  reintentar(): void {
    this.consulta.reload();
  }

  actualizarEstado(estado: string): void {
    this.actualizarDatos({ estado });
  }

  actualizarDatos(cambios: Partial<DatosPublicacion>): void {
    this.consulta.update((actual) => (actual ? { ...actual, ...cambios } : actual));
  }
}
