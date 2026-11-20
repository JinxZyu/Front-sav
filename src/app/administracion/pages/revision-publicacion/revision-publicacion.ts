import { TitleCasePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, linkedSignal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, Subscription, finalize, map } from 'rxjs';
import { ImagenPublicacion } from '../../../alojamiento/components/imagen-publicacion/imagen-publicacion';
import {
  estadoPublicacion,
  formatearPorcentaje,
} from '../../../alojamiento/models/alojamiento.models';
import { formatearEspacios, formatearPesos } from '../../../alojamiento/utils/formato';
import { estadoDeConsulta } from '../../../reserva/utils/consulta-reserva';
import { AvisosService } from '../../../shared/services/avisos.service';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { FormularioMotivo } from '../../components/formulario-motivo/formulario-motivo';
import {
  EN_REVISION,
  MAXIMO_MOTIVO_PUBLICACION,
  MODOS_ACEPTACION_ADMINISTRACION,
} from '../../models/publicacion-administrada.models';
import { GestionPublicacionesService } from '../../services/gestion-publicaciones.service';

type Accion = 'rechazar';

@Component({
  selector: 'app-revision-publicacion',
  imports: [RouterLink, TitleCasePipe, ImagenPublicacion, FormularioMotivo],
  templateUrl: './revision-publicacion.html',
  styleUrls: ['../../styles/pagina-administracion.css', './revision-publicacion.css'],
})
export class RevisionPublicacion {
  private readonly servicio = inject(GestionPublicacionesService);
  private readonly avisos = inject(AvisosService);

  private readonly idPublicacion = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((parametros) => parametros.get('idPublicacion') ?? ''),
    ),
    { initialValue: '' },
  );

  protected readonly consulta = rxResource({
    params: () => this.idPublicacion() || undefined,
    stream: ({ params }) => this.servicio.detalle(params),
  });

  private readonly estadoConsulta = estadoDeConsulta(this.consulta);
  protected readonly datos = this.estadoConsulta.valor;
  protected readonly noEncontrada = this.estadoConsulta.noEncontrada;
  protected readonly error = computed(() =>
    this.estadoConsulta.error()
      ? mensajeDeError(this.consulta.error(), 'No pudimos cargar la publicación.')
      : null,
  );

  protected readonly imagenes = computed(() =>
    [...(this.datos()?.publicacion.imagenes ?? [])].sort(
      (a, b) => Number(b.esPortada) - Number(a.esPortada) || a.orden - b.orden,
    ),
  );

  protected readonly enRevision = computed(() => this.datos()?.publicacion.estado === EN_REVISION);

  protected readonly accion = linkedSignal<string, Accion | null>({
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
  protected readonly ocupado = computed(() => this.enviando() || this.consulta.isLoading());

  protected readonly maximoMotivo = MAXIMO_MOTIVO_PUBLICACION;
  protected readonly estado = estadoPublicacion;
  protected readonly pesos = formatearPesos;
  protected readonly porcentaje = formatearPorcentaje;
  protected readonly espacios = formatearEspacios;

  private envio: Subscription | null = null;

  protected modo(valor: string): string {
    return MODOS_ACEPTACION_ADMINISTRACION[valor] ?? valor;
  }

  constructor() {
    inject(DestroyRef).onDestroy(() => this.envio?.unsubscribe());
  }

  protected abrir(accion: Accion): void {
    if (!this.ocupado()) {
      this.errorAccion.set(null);
      this.accion.set(accion);
    }
  }

  protected cerrar(): void {
    if (!this.enviando()) {
      this.errorAccion.set(null);
      this.accion.set(null);
    }
  }

  protected aprobar(): void {
    this.ejecutar(
      (id) => this.servicio.aprobar(id),
      'Publicación aprobada',
      'No pudimos aprobar la publicación.',
    );
  }

  protected rechazar(motivo: string): void {
    this.ejecutar(
      (id) => this.servicio.rechazar(id, motivo),
      'Publicación rechazada',
      'No pudimos rechazar la publicación.',
    );
  }

  private ejecutar(
    peticion: (idPublicacion: string) => Observable<{ mensaje: string }>,
    titulo: string,
    porDefecto: string,
  ): void {
    if (this.ocupado()) {
      return;
    }
    const idPublicacion = this.idPublicacion();
    this.enviando.set(true);
    this.errorAccion.set(null);
    this.envio = peticion(idPublicacion)
      .pipe(
        finalize(() => {
          if (this.idPublicacion() === idPublicacion) {
            this.enviando.set(false);
          }
        }),
      )
      .subscribe({
        next: (respuesta) => {
          this.accion.set(null);
          this.avisos.mostrar(titulo, respuesta.mensaje);
          this.consulta.reload();
        },
        error: (error: unknown) => this.errorAccion.set(mensajeDeError(error, porDefecto)),
      });
  }
}
