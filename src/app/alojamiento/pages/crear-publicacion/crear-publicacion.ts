import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, map } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { PATRON_CON_TEXTO } from '../../../shared/utils/validadores';
import { CuentaService } from '../../../usuario/services/cuenta.service';
import { ImagenPublicacion } from '../../components/imagen-publicacion/imagen-publicacion';
import {
  MAX_IMAGENES,
  SelectorImagenes,
} from '../../components/selector-imagenes/selector-imagenes';
import {
  DetallePublicacion,
  MODOS_ACEPTACION,
  ModoAceptacion,
  PoliticaCancelacion,
  PublicacionCreada,
  TIPOS_ALOJAMIENTO,
} from '../../models/alojamiento.models';
import { PublicacionAlojamientoService } from '../../services/publicacion-alojamiento.service';

const MAX_SERVICIOS = 20;
const PATRON_ENTERO = /^\d+$/;

const texto = (maximo: number) => [
  Validators.required,
  Validators.pattern(PATRON_CON_TEXTO),
  Validators.maxLength(maximo),
];

const cantidadServicios = (control: AbstractControl<string[]>): ValidationErrors | null => {
  const total = control.value.length;
  return total === 0 || total > MAX_SERVICIOS ? { cantidad: true } : null;
};

const ETIQUETAS = {
  titulo: 'Título',
  tipoAlojamiento: 'Tipo de alojamiento',
  descripcion: 'Descripción',
  reglas: 'Reglas de la casa',
  ciudad: 'Ciudad',
  ubicacion: 'Dirección o ubicación',
  capacidad: 'Capacidad',
  precioPorNoche: 'Precio por noche',
  tarifaLimpieza: 'Tarifa de limpieza',
  modoAceptacion: 'Cómo aceptas las reservas',
  idPolitica: 'Política de cancelación',
  idsServicios: 'Servicios',
} as const;

type Campo = keyof typeof ETIQUETAS;

@Component({
  selector: 'app-crear-publicacion',
  imports: [ReactiveFormsModule, RouterLink, SelectorImagenes, ImagenPublicacion],
  templateUrl: './crear-publicacion.html',
  styleUrl: './crear-publicacion.css',
})
export class CrearPublicacion {
  private readonly servicio = inject(PublicacionAlojamientoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly resumenErrores = viewChild<ElementRef<HTMLElement>>('resumenErrores');
  private readonly tituloExito = viewChild<ElementRef<HTMLElement>>('tituloExito');
  private readonly router = inject(Router);

  readonly idPublicacion = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((parametros) => parametros.get('idPublicacion'))),
    { initialValue: null },
  );
  readonly edicion = computed(() => this.idPublicacion() !== null);

  readonly original = rxResource({
    params: () => this.idPublicacion() ?? undefined,
    stream: ({ params }) => this.servicio.detalle(params),
  });

  private readonly cargada = signal<string | null>(null);
  readonly listo = computed(() => !this.edicion() || this.cargada() === this.idPublicacion());
  readonly politicaInactiva = signal(false);

  readonly noEncontrada = computed(() => {
    const error = this.original.status() === 'error' ? this.original.error() : null;
    return error instanceof HttpErrorResponse && [400, 403, 404].includes(error.status);
  });

  readonly errorCarga = computed(() =>
    this.original.status() === 'error' && !this.noEncontrada()
      ? mensajeDeError(this.original.error(), 'No pudimos cargar la publicación.')
      : null,
  );

  readonly imagenesActuales = computed(() => {
    const imagenes = this.original.hasValue() ? [...this.original.value().imagenes] : [];
    return imagenes.sort((a, b) => Number(b.esPortada) - Number(a.esPortada) || a.orden - b.orden);
  });

  readonly tipos = computed<readonly string[]>(() => {
    const actual = this.original.hasValue() ? this.original.value().tipoAlojamiento : '';
    return actual && !(TIPOS_ALOJAMIENTO as readonly string[]).includes(actual)
      ? [...TIPOS_ALOJAMIENTO, actual]
      : TIPOS_ALOJAMIENTO;
  });

  readonly cuenta = inject(CuentaService).actual;
  readonly modos = MODOS_ACEPTACION;
  readonly maxImagenes = MAX_IMAGENES;

  readonly servicios = rxResource({ stream: () => this.servicio.servicios() });
  readonly politicas = rxResource({ stream: () => this.servicio.politicas() });

  readonly imagenes = signal<File[]>([]);
  readonly enviando = signal(false);
  readonly intentoEnviar = signal(false);
  readonly faltantes = signal<string[]>([]);
  readonly error = signal<string | null>(null);
  readonly creada = signal<PublicacionCreada | null>(null);

  readonly imagenesInvalidas = computed(
    () =>
      this.intentoEnviar() &&
      ((!this.edicion() && this.imagenes().length === 0) || this.imagenes().length > MAX_IMAGENES),
  );

  readonly formulario = inject(FormBuilder).nonNullable.group({
    titulo: ['', texto(200)],
    descripcion: ['', texto(2000)],
    reglas: ['', texto(1000)],
    ubicacion: ['', texto(255)],
    ciudad: ['', texto(100)],
    tipoAlojamiento: ['', [Validators.required]],
    capacidad: [
      '',
      [
        Validators.required,
        Validators.pattern(PATRON_ENTERO),
        Validators.min(1),
        Validators.max(50),
      ],
    ],
    precioPorNoche: [
      '',
      [Validators.required, Validators.pattern(PATRON_ENTERO), Validators.min(1)],
    ],
    tarifaLimpieza: ['0', [Validators.pattern(PATRON_ENTERO), Validators.min(0)]],
    modoAceptacion: ['' as ModoAceptacion | '', [Validators.required]],
    idPolitica: ['', [Validators.required]],
    idsServicios: [[] as string[], [cantidadServicios]],
  });

  constructor() {
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.actualizarFaltantes());
    effect(() => {
      this.imagenes();
      this.actualizarFaltantes();
    });
    effect(() => {
      const detalle = this.original.hasValue() ? this.original.value() : null;
      const politicas = this.politicas.hasValue() ? this.politicas.value() : null;
      untracked(() => {
        if (detalle && detalle.idPublicacion !== this.cargada()) {
          this.rellenar(detalle);
        }
        if (detalle && politicas) {
          this.descartarPoliticaInactiva(politicas);
        }
      });
    });
  }

  invalido(campo: Campo): boolean {
    const control = this.formulario.controls[campo];
    return control.invalid && (control.touched || control.dirty || this.intentoEnviar());
  }

  servicioMarcado(idServicio: string): boolean {
    return this.formulario.controls.idsServicios.value.includes(idServicio);
  }

  alternarServicio(idServicio: string): void {
    const control = this.formulario.controls.idsServicios;
    const actuales = control.value;
    control.setValue(
      actuales.includes(idServicio)
        ? actuales.filter((actual) => actual !== idServicio)
        : [...actuales, idServicio],
    );
    control.markAsTouched();
  }

  formatearPorcentaje(valor: number | null): string {
    return valor === null ? '' : `${Number(valor)} %`;
  }

  publicar(): void {
    if (this.enviando()) {
      return;
    }
    this.intentoEnviar.set(true);
    this.error.set(null);

    const faltantes = this.calcularFaltantes();
    this.faltantes.set(faltantes);
    if (faltantes.length) {
      this.formulario.markAllAsTouched();
      afterNextRender(() => this.resumenErrores()?.nativeElement.focus(), {
        injector: this.injector,
      });
      return;
    }

    const valores = this.formulario.getRawValue();
    const idPublicacion = this.idPublicacion();
    const datos = {
      titulo: valores.titulo.trim(),
      descripcion: valores.descripcion.trim(),
      reglas: valores.reglas.trim(),
      ubicacion: valores.ubicacion.trim(),
      ciudad: valores.ciudad.trim(),
      tipoAlojamiento: valores.tipoAlojamiento,
      capacidad: Number(valores.capacidad),
      precioPorNoche: Number(valores.precioPorNoche),
      tarifaLimpieza: Number(valores.tarifaLimpieza || 0),
      modoAceptacion: valores.modoAceptacion as ModoAceptacion,
      idPolitica: valores.idPolitica,
      idsServicios: valores.idsServicios,
      imagenes: this.imagenes(),
    };
    this.enviando.set(true);
    (idPublicacion ? this.servicio.editar(idPublicacion, datos) : this.servicio.crear(datos))
      .pipe(
        finalize(() => this.enviando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (respuesta) => {
          if (idPublicacion) {
            void this.router.navigate(['/alojamientos', idPublicacion], {
              queryParams: { aviso: 'actualizada' },
            });
            return;
          }
          this.creada.set(respuesta);
          afterNextRender(() => this.tituloExito()?.nativeElement.focus(), {
            injector: this.injector,
          });
        },
        error: (error: unknown) =>
          this.error.set(
            mensajeDeError(
              error,
              idPublicacion
                ? 'No pudimos guardar los cambios.'
                : 'No pudimos crear la publicación.',
            ),
          ),
      });
  }

  private calcularFaltantes(): string[] {
    const faltantes: string[] = (Object.keys(ETIQUETAS) as Campo[])
      .filter((campo) => this.formulario.controls[campo].invalid)
      .map((campo) => ETIQUETAS[campo]);
    if (!this.edicion() && this.imagenes().length === 0) {
      faltantes.push('Imágenes');
    }
    return faltantes;
  }

  private actualizarFaltantes(): void {
    if (this.intentoEnviar()) {
      this.faltantes.set(this.calcularFaltantes());
    }
  }

  private rellenar(detalle: DetallePublicacion): void {
    this.formulario.reset({
      titulo: detalle.titulo,
      descripcion: detalle.descripcion,
      reglas: detalle.reglas ?? '',
      ubicacion: detalle.ubicacion,
      ciudad: detalle.ciudad,
      tipoAlojamiento: detalle.tipoAlojamiento,
      capacidad: String(detalle.capacidad),
      precioPorNoche: String(detalle.precioPorNoche),
      tarifaLimpieza: String(detalle.tarifaLimpieza ?? 0),
      modoAceptacion: MODOS_ACEPTACION.some((modo) => modo.valor === detalle.modoAceptacion)
        ? (detalle.modoAceptacion as ModoAceptacion)
        : '',
      idPolitica: detalle.idPolitica,
      idsServicios: detalle.servicios.map((servicio) => servicio.idServicio),
    });
    this.imagenes.set([]);
    this.intentoEnviar.set(false);
    this.faltantes.set([]);
    this.error.set(null);
    this.politicaInactiva.set(false);
    this.cargada.set(detalle.idPublicacion);
  }

  private descartarPoliticaInactiva(politicas: PoliticaCancelacion[]): void {
    const control = this.formulario.controls.idPolitica;
    if (control.value && !politicas.some((politica) => politica.idPolitica === control.value)) {
      control.setValue('');
      this.politicaInactiva.set(true);
    }
  }

  crearOtra(): void {
    this.formulario.reset();
    this.imagenes.set([]);
    this.intentoEnviar.set(false);
    this.faltantes.set([]);
    this.error.set(null);
    this.creada.set(null);
  }
}
