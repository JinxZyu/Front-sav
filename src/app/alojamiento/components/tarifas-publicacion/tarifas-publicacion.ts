import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { PATRON_CON_TEXTO } from '../../../shared/utils/validadores';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { ConfiguracionComercial, ServicioAdicional } from '../../models/alojamiento.models';
import { PublicacionAlojamientoService } from '../../services/publicacion-alojamiento.service';
import { formatearPesos } from '../../utils/formato';

const PATRON_ENTERO = /^\d+$/;

const enteroSeguro = (control: AbstractControl<string>): ValidationErrors | null => {
  const valor = String(control.value ?? '');
  if (valor === '') {
    return null;
  }
  return PATRON_ENTERO.test(valor) && Number.isSafeInteger(Number(valor)) ? null : { entero: true };
};
export const MAX_SERVICIOS_ADICIONALES = 20;

const nombresUnicos = (control: AbstractControl): ValidationErrors | null => {
  const nombres = (control as FormArray<FormGroup>).controls
    .map((fila) =>
      String(fila.get('nombre')?.value ?? '')
        .trim()
        .toLocaleLowerCase('es'),
    )
    .filter(Boolean);
  return new Set(nombres).size === nombres.length ? null : { duplicados: true };
};

@Component({
  selector: 'app-tarifas-publicacion',
  imports: [ReactiveFormsModule],
  templateUrl: './tarifas-publicacion.html',
  styleUrls: ['../../styles/configuracion.css', './tarifas-publicacion.css'],
  host: { '[class.editando]': 'editando()' },
})
export class TarifasPublicacion {
  private readonly servicio = inject(PublicacionAlojamientoService);
  private readonly destruccion = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly idPublicacion = input.required<string>();
  readonly editable = input(true);
  readonly guardado = output<ConfiguracionComercial>();

  readonly actual = rxResource({
    params: () => this.idPublicacion(),
    stream: ({ params }) => this.servicio.configuracionComercial(params),
  });

  readonly activos = computed(() =>
    this.actual.hasValue()
      ? this.actual.value().serviciosAdicionales.filter((adicional) => adicional.activo)
      : [],
  );

  readonly errorCarga = computed(() =>
    this.actual.status() === 'error'
      ? mensajeDeError(this.actual.error(), 'No pudimos consultar las tarifas.')
      : null,
  );

  readonly formulario = this.fb.group({
    tarifaLimpieza: ['0', [Validators.required, enteroSeguro]],
    servicios: this.fb.array<FormGroup>([], nombresUnicos),
  });

  readonly editando = linkedSignal({ source: this.editable, computation: () => false });
  readonly guardando = signal(false);
  readonly intento = signal(false);
  readonly aviso = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly maximo = MAX_SERVICIOS_ADICIONALES;
  readonly pesos = formatearPesos;

  get filas(): FormArray<FormGroup> {
    return this.formulario.controls.servicios;
  }

  invalido(control: AbstractControl | null): boolean {
    return !!control && control.invalid && (control.touched || this.intento());
  }

  cambiar(): void {
    const actual = this.actual.hasValue() ? this.actual.value() : null;
    this.filas.clear();
    for (const adicional of this.activos()) {
      this.filas.push(this.fila(adicional));
    }
    this.formulario.controls.tarifaLimpieza.setValue(String(actual?.tarifaLimpieza ?? 0));
    this.formulario.markAsUntouched();
    this.intento.set(false);
    this.aviso.set(null);
    this.error.set(null);
    this.editando.set(true);
  }

  agregar(): void {
    if (this.filas.length < MAX_SERVICIOS_ADICIONALES) {
      this.filas.push(this.fila());
    }
  }

  quitar(indice: number): void {
    this.filas.removeAt(indice);
  }

  cancelar(): void {
    this.editando.set(false);
    this.error.set(null);
  }

  guardar(): void {
    if (!this.editable() || this.guardando()) {
      return;
    }
    this.intento.set(true);
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valores = this.formulario.getRawValue();
    this.error.set(null);
    this.guardando.set(true);
    this.servicio
      .guardarConfiguracionComercial(this.idPublicacion(), {
        tarifaLimpieza: Number(valores.tarifaLimpieza),
        serviciosAdicionales: this.filas.controls.map((fila) => {
          const { nombre, descripcion, costo } = fila.getRawValue() as Record<string, string>;
          return {
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || null,
            costo: Number(costo),
          };
        }),
      })
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe({
        next: (configuracion) => {
          this.actual.set(configuracion);
          this.editando.set(false);
          this.aviso.set('Guardamos la tarifa de limpieza y los servicios adicionales.');
          this.guardado.emit(configuracion);
        },
        error: (error: unknown) =>
          this.error.set(mensajeDeError(error, 'No pudimos guardar las tarifas.')),
      });
  }

  private fila(adicional?: ServicioAdicional): FormGroup {
    return this.fb.group({
      nombre: [
        adicional?.nombre ?? '',
        [Validators.required, Validators.pattern(PATRON_CON_TEXTO), Validators.maxLength(100)],
      ],
      descripcion: [adicional?.descripcion ?? '', [Validators.maxLength(255)]],
      costo: [adicional ? String(adicional.costo) : '', [Validators.required, enteroSeguro]],
    });
  }
}
