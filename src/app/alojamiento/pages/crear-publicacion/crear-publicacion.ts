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
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { PATRON_CON_TEXTO } from '../../../shared/utils/validadores';
import { CuentaService } from '../../../usuario/services/cuenta.service';
import {
  MAX_IMAGENES,
  SelectorImagenes,
} from '../../components/selector-imagenes/selector-imagenes';
import {
  MODOS_ACEPTACION,
  ModoAceptacion,
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
  imports: [ReactiveFormsModule, RouterLink, SelectorImagenes],
  templateUrl: './crear-publicacion.html',
  styleUrl: './crear-publicacion.css',
})
export class CrearPublicacion {
  private readonly servicio = inject(PublicacionAlojamientoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly resumenErrores = viewChild<ElementRef<HTMLElement>>('resumenErrores');
  private readonly tituloExito = viewChild<ElementRef<HTMLElement>>('tituloExito');

  readonly cuenta = inject(CuentaService).actual;
  readonly tipos = TIPOS_ALOJAMIENTO;
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
      (this.imagenes().length === 0 || this.imagenes().length > MAX_IMAGENES),
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
    this.enviando.set(true);
    this.servicio
      .crear({
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
      })
      .pipe(
        finalize(() => this.enviando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (respuesta) => {
          this.creada.set(respuesta);
          afterNextRender(() => this.tituloExito()?.nativeElement.focus(), {
            injector: this.injector,
          });
        },
        error: (error: unknown) =>
          this.error.set(mensajeDeError(error, 'No pudimos crear la publicación.')),
      });
  }

  private calcularFaltantes(): string[] {
    const faltantes: string[] = (Object.keys(ETIQUETAS) as Campo[])
      .filter((campo) => this.formulario.controls[campo].invalid)
      .map((campo) => ETIQUETAS[campo]);
    if (this.imagenes().length === 0) {
      faltantes.push('Imágenes');
    }
    return faltantes;
  }

  private actualizarFaltantes(): void {
    if (this.intentoEnviar()) {
      this.faltantes.set(this.calcularFaltantes());
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
