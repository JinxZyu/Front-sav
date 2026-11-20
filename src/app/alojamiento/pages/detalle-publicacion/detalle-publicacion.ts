import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, untracked } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AvisosService } from '../../../shared/services/avisos.service';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { AccionesEstado } from '../../components/acciones-estado/acciones-estado';
import { ImagenPublicacion } from '../../components/imagen-publicacion/imagen-publicacion';
import { ModoAceptacionPublicacion } from '../../components/modo-aceptacion-publicacion/modo-aceptacion-publicacion';
import { PoliticaPublicacion } from '../../components/politica-publicacion/politica-publicacion';
import { TarifasPublicacion } from '../../components/tarifas-publicacion/tarifas-publicacion';
import {
  ConfiguracionComercial,
  DetallePublicacion as DatosPublicacion,
  ModoAceptacionDePublicacion,
  estadoPublicacion,
  modoAceptacion,
  motivoSinEdicion,
} from '../../models/alojamiento.models';
import { PublicacionAlojamientoService } from '../../services/publicacion-alojamiento.service';
import { formatearEspacios, formatearFecha, formatearPesos } from '../../utils/formato';

const AVISOS: Record<string, [string, string]> = {
  'en-revision': [
    'Cambios enviados a revisión',
    'Te avisaremos cuando un administrador los revise; tus reservas actuales siguen igual.',
  ],
  actualizada: ['Cambios guardados', 'Guardamos los cambios de tu publicación.'],
};

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
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly avisos = inject(AvisosService);

  private readonly idPublicacion = toSignal(
    this.ruta.paramMap.pipe(map((parametros) => parametros.get('idPublicacion') ?? '')),
    { initialValue: '' },
  );

  private readonly aviso = toSignal(
    this.ruta.queryParamMap.pipe(map((parametros) => parametros.get('aviso'))),
    { initialValue: null },
  );

  constructor() {
    effect(() => {
      const aviso = this.aviso();
      const contenido = aviso ? AVISOS[aviso] : undefined;
      if (!aviso) {
        return;
      }
      untracked(() => {
        if (contenido) {
          this.avisos.mostrar(...contenido);
        }
        const url = this.router.createUrlTree([], {
          relativeTo: this.ruta,
          queryParams: { aviso: null },
          queryParamsHandling: 'merge',
        });
        this.location.replaceState(this.router.serializeUrl(url));
      });
    });
  }

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

  alGuardarTarifas(configuracion: ConfiguracionComercial): void {
    this.actualizarDatos({
      tarifaLimpieza: configuracion.tarifaLimpieza,
      ...conFecha(configuracion.fechaActualizacion),
    });
  }

  alGuardarModo(respuesta: ModoAceptacionDePublicacion): void {
    this.actualizarDatos({
      modoAceptacion: respuesta.modoAceptacion,
      ...conFecha(respuesta.fechaActualizacion),
    });
  }

  actualizarDatos(cambios: Partial<DatosPublicacion>): void {
    this.consulta.update((actual) => (actual ? { ...actual, ...cambios } : actual));
  }
}

function conFecha(fechaActualizacion: string | null): Partial<DatosPublicacion> {
  return fechaActualizacion ? { fechaActualizacion } : {};
}
