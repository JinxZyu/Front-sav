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
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, map, merge } from 'rxjs';
import { PAIS_POR_DEFECTO } from '../../../shared/models/ubicacion.models';
import { AvisosService } from '../../../shared/services/avisos.service';
import { UbicacionService } from '../../../shared/services/ubicacion.service';
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
  ESTADOS_CON_REVISION_DE_CAMBIOS,
  MAXIMO_MENSAJE_CAMBIOS,
  motivoSinEdicion,
  PoliticaCancelacion,
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

const cantidadEspacio = [
  Validators.required,
  Validators.pattern(PATRON_ENTERO),
  Validators.min(1),
  Validators.max(50),
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
  pais: 'País',
  ciudad: 'Ciudad',
  ubicacion: 'Dirección o ubicación',
  capacidad: 'Capacidad',
  habitaciones: 'Habitaciones',
  camas: 'Camas',
  banos: 'Baños',
  precioPorNoche: 'Precio por noche',
  tarifaLimpieza: 'Tarifa de limpieza',
  modoAceptacion: 'Cómo aceptas las reservas',
  idPolitica: 'Política de cancelación',
  idsServicios: 'Servicios incluidos',
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
  private readonly router = inject(Router);
  private readonly ubicacion = inject(UbicacionService);
  private readonly avisos = inject(AvisosService);

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
  readonly sinEdicion = computed(() =>
    this.edicion() && this.original.hasValue()
      ? motivoSinEdicion(this.original.value().estado)
      : null,
  );

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

  readonly espacios = [
    { campo: 'habitaciones', etiqueta: 'Habitaciones' },
    { campo: 'camas', etiqueta: 'Camas', ayuda: 'Total de camas en todo el alojamiento.' },
    { campo: 'banos', etiqueta: 'Baños' },
  ] as const;

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
    pais: ['', [Validators.required]],
    ciudad: ['', texto(100)],
    tipoAlojamiento: ['', [Validators.required]],
    capacidad: ['', cantidadEspacio],
    habitaciones: ['1', cantidadEspacio],
    camas: ['1', cantidadEspacio],
    banos: ['1', cantidadEspacio],
    precioPorNoche: [
      '',
      [Validators.required, Validators.pattern(PATRON_ENTERO), Validators.min(1)],
    ],
    tarifaLimpieza: ['0', [Validators.pattern(PATRON_ENTERO), Validators.min(0)]],
    modoAceptacion: ['' as ModoAceptacion | '', [Validators.required]],
    idPolitica: ['', [Validators.required]],
    idsServicios: [[] as string[], [cantidadServicios]],
  });

  readonly mensajeCambios = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(MAXIMO_MENSAJE_CAMBIOS)],
  });
  readonly maximoMensaje = MAXIMO_MENSAJE_CAMBIOS;

  private readonly valores = toSignal(this.formulario.valueChanges, {
    initialValue: this.formulario.getRawValue(),
  });

  readonly camposEnRevision = computed(() => {
    if (!this.edicion() || !this.original.hasValue() || !this.listo()) {
      return [];
    }
    const original = this.original.value();
    if (!ESTADOS_CON_REVISION_DE_CAMBIOS.includes(original.estado)) {
      return [];
    }
    this.valores();
    const valores = this.formulario.getRawValue();
    const fotos = this.imagenes().length > 0;
    const comparaciones: [string, string | number, string | number][] = [
      ['Título', original.titulo, valores.titulo],
      ['Descripción', original.descripcion, valores.descripcion],
      ['Reglas', original.reglas ?? '', valores.reglas],
      ['Fotos', '', fotos ? 'nuevas' : ''],
      ['Ubicación', original.ubicacion, valores.ubicacion],
      ['Ciudad', original.ciudad, valores.ciudad],
      ['Tipo de alojamiento', original.tipoAlojamiento, valores.tipoAlojamiento],
      ['Capacidad', original.capacidad, valores.capacidad],
      ['Habitaciones', original.habitaciones, valores.habitaciones],
      ['Camas', original.camas, valores.camas],
      ['Baños', original.banos, valores.banos],
    ];
    const campos = comparaciones
      .filter(([, antes, ahora]) => String(antes).trim() !== String(ahora).trim())
      .map(([campo]) => campo);
    return campos;
  });

  private readonly idPais = toSignal(this.formulario.controls.pais.valueChanges, {
    initialValue: '',
  });
  private readonly ciudadGuardada = signal<string | null>(null);
  readonly ciudadSinPais = signal<string | null>(null);

  readonly paises = rxResource({ stream: () => this.ubicacion.paises() });
  readonly ciudades = rxResource({
    params: () => this.idPais() || undefined,
    stream: ({ params }) => this.ubicacion.ciudades(params),
  });

  readonly listaPaises = computed(() => (this.paises.hasValue() ? this.paises.value() : []));
  readonly opcionesCiudad = computed(() =>
    this.ciudades.hasValue()
      ? [...new Set(this.ciudades.value().map((ciudad) => ciudad.nombre))]
      : [],
  );

  readonly errorPaises = computed(() =>
    this.paises.status() === 'error'
      ? mensajeDeError(this.paises.error(), 'No pudimos cargar los países.')
      : null,
  );
  readonly errorCiudades = computed(() =>
    this.ciudades.status() === 'error'
      ? mensajeDeError(this.ciudades.error(), 'No pudimos cargar las ciudades.')
      : null,
  );

  constructor() {
    effect(() => {
      const paises = this.listaPaises();
      untracked(() => {
        const control = this.formulario.controls.pais;
        const porDefecto = paises.find((pais) => pais.codigoIso2 === PAIS_POR_DEFECTO);
        if (!control.value && porDefecto) {
          control.setValue(porDefecto.idPais);
        }
      });
    });
    effect(() => {
      const nombres = this.opcionesCiudad();
      const guardada = this.ciudadGuardada();
      if (guardada && this.ciudades.hasValue()) {
        untracked(() => this.ubicarCiudadGuardada(guardada, nombres));
      }
    });
    merge(this.formulario.valueChanges, this.mensajeCambios.valueChanges)
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
    return this.sinValor(campo) && (control.touched || control.dirty || this.intentoEnviar());
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
      habitaciones: Number(valores.habitaciones),
      camas: Number(valores.camas),
      banos: Number(valores.banos),
      precioPorNoche: Number(valores.precioPorNoche),
      tarifaLimpieza: Number(valores.tarifaLimpieza || 0),
      modoAceptacion: valores.modoAceptacion as ModoAceptacion,
      idPolitica: valores.idPolitica,
      idsServicios: valores.idsServicios,
      imagenes: this.imagenes(),
      mensajeCambios:
        this.camposEnRevision().length > 0 ? this.mensajeCambios.value.trim() : undefined,
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
              queryParams: {
                aviso: respuesta.estado === 'PENDIENTE_REVISION' ? 'en-revision' : 'actualizada',
              },
              replaceUrl: true,
            });
            return;
          }
          this.avisos.mostrar(
            'Publicación creada',
            `"${respuesta.titulo}" quedó en borrador. Envíala a revisión desde su detalle cuando esté lista.`,
          );
          void this.router.navigate(['/alojamientos'], { replaceUrl: true });
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
      .filter((campo) => this.sinValor(campo))
      .map((campo) => ETIQUETAS[campo]);
    if (!this.edicion() && this.imagenes().length === 0) {
      faltantes.push('Imágenes');
    }
    if (this.camposEnRevision().length > 0 && !this.mensajeValido()) {
      faltantes.push('Mensaje para el administrador');
    }
    return faltantes;
  }

  mensajeInvalido(): boolean {
    return this.intentoEnviar() && this.camposEnRevision().length > 0 && !this.mensajeValido();
  }

  private mensajeValido(): boolean {
    const mensaje = this.mensajeCambios.value.trim();
    return mensaje.length > 0 && mensaje.length <= MAXIMO_MENSAJE_CAMBIOS;
  }

  private sinValor(campo: Campo): boolean {
    return (
      this.formulario.controls[campo].invalid || (campo === 'idPolitica' && !this.politicaVigente())
    );
  }

  private politicaVigente(): boolean {
    const idPolitica = this.formulario.controls.idPolitica.value;
    return (
      this.politicas.hasValue() &&
      this.politicas.value().some((politica) => politica.idPolitica === idPolitica)
    );
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
      pais: this.formulario.controls.pais.value,
      ciudad: detalle.ciudad,
      tipoAlojamiento: detalle.tipoAlojamiento,
      capacidad: String(detalle.capacidad),
      habitaciones: String(detalle.habitaciones),
      camas: String(detalle.camas),
      banos: String(detalle.banos),
      precioPorNoche: String(detalle.precioPorNoche),
      tarifaLimpieza: String(detalle.tarifaLimpieza ?? 0),
      modoAceptacion: MODOS_ACEPTACION.some((modo) => modo.valor === detalle.modoAceptacion)
        ? (detalle.modoAceptacion as ModoAceptacion)
        : '',
      idPolitica: detalle.idPolitica,
      idsServicios: detalle.servicios.map((servicio) => servicio.idServicio),
    });
    this.imagenes.set([]);
    this.mensajeCambios.reset('');
    this.intentoEnviar.set(false);
    this.faltantes.set([]);
    this.error.set(null);
    this.politicaInactiva.set(false);
    this.ciudadSinPais.set(null);
    this.ciudadGuardada.set(detalle.ciudad);
    this.cargada.set(detalle.idPublicacion);
  }

  private ubicarCiudadGuardada(guardada: string, nombres: string[]): void {
    const ciudad = this.formulario.controls.ciudad;
    const pais = this.formulario.controls.pais;
    if (nombres.includes(guardada)) {
      if (!ciudad.value) {
        ciudad.setValue(guardada);
      }
      this.ciudadGuardada.set(null);
      this.ciudadSinPais.set(null);
      return;
    }
    if (!pais.dirty) {
      pais.setValue('');
      ciudad.setValue('');
      this.ciudadSinPais.set(guardada);
    }
  }

  private descartarPoliticaInactiva(politicas: PoliticaCancelacion[]): void {
    const control = this.formulario.controls.idPolitica;
    if (control.value && !politicas.some((politica) => politica.idPolitica === control.value)) {
      control.setValue('');
      this.politicaInactiva.set(true);
    }
  }

  alCambiarPais(): void {
    this.formulario.controls.ciudad.setValue('');
  }
}
