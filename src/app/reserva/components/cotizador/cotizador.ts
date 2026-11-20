import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, finalize } from 'rxjs';
import {
  DetallePublicacion,
  ServicioAdicional,
  formatearPorcentaje,
} from '../../../alojamiento/models/alojamiento.models';
import { formatearPesos } from '../../../alojamiento/utils/formato';
import { desdeHoy, hoy, moverDias, rangoValido } from '../../../disponibilidad/utils/fechas';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { Cotizacion } from '../../models/reserva.models';
import { ReservaService } from '../../services/reserva.service';

const ENTERO = /^\d+$/;
const VALIDADORES_HUESPEDES = [Validators.required, Validators.min(1), Validators.pattern(ENTERO)];

@Component({
  selector: 'app-cotizador',
  imports: [ReactiveFormsModule],
  templateUrl: './cotizador.html',
  styleUrl: './cotizador.css',
})
export class Cotizador {
  private readonly servicio = inject(ReservaService);

  readonly publicacion = input.required<DetallePublicacion>();
  readonly adicionales = input<ServicioAdicional[]>([]);
  readonly llegada = input('');
  readonly salida = input('');
  readonly huespedes = input('');

  protected readonly minimo = hoy();
  protected readonly cotizacion = signal<Cotizacion | null>(null);
  protected readonly calculando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = inject(FormBuilder).nonNullable.group(
    {
      llegada: ['', [Validators.required, desdeHoy]],
      salida: ['', [Validators.required]],
      huespedes: [1, VALIDADORES_HUESPEDES],
      adicionales: [[] as string[]],
    },
    { validators: rangoValido('llegada', 'salida') },
  );

  protected readonly pesos = formatearPesos;
  protected readonly porcentaje = formatearPorcentaje;
  protected readonly moverDias = moverDias;

  private solicitud: Subscription | null = null;

  constructor() {
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.descartarCotizacion());
    inject(DestroyRef).onDestroy(() => this.solicitud?.unsubscribe());
    effect(() => {
      const capacidad = this.publicacion().capacidad;
      const busqueda = {
        llegada: this.llegada(),
        salida: this.salida(),
        huespedes: this.huespedes(),
      };
      untracked(() => this.prepararBusqueda(capacidad, busqueda));
    });
  }

  private prepararBusqueda(
    capacidad: number,
    busqueda: { llegada: string; salida: string; huespedes: string },
  ): void {
    const huespedes = Number(busqueda.huespedes);
    this.formulario.controls.huespedes.setValidators([
      ...VALIDADORES_HUESPEDES,
      Validators.max(capacidad),
    ]);
    this.formulario.setValue({
      llegada: busqueda.llegada,
      salida: busqueda.salida,
      huespedes: Number.isInteger(huespedes) && huespedes > 0 ? Math.min(huespedes, capacidad) : 1,
      adicionales: [],
    });
    if (this.formulario.valid) {
      this.cotizar();
    }
  }

  private descartarCotizacion(): void {
    this.solicitud?.unsubscribe();
    this.solicitud = null;
    this.calculando.set(false);
    this.cotizacion.set(null);
    this.error.set(null);
  }

  protected marcado(idAdicional: string): boolean {
    return this.formulario.controls.adicionales.value.includes(idAdicional);
  }

  protected alternar(idAdicional: string): void {
    const control = this.formulario.controls.adicionales;
    control.setValue(
      this.marcado(idAdicional)
        ? control.value.filter((actual) => actual !== idAdicional)
        : [...control.value, idAdicional],
    );
  }

  protected cotizar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valores = this.formulario.getRawValue();
    this.solicitud?.unsubscribe();
    this.calculando.set(true);
    this.error.set(null);
    this.solicitud = this.servicio
      .cotizar({
        idPublicacion: this.publicacion().idPublicacion,
        fechaEntrada: valores.llegada,
        fechaSalida: valores.salida,
        cantidadHuespedes: valores.huespedes,
        idsAdicionales: valores.adicionales,
      })
      .pipe(finalize(() => this.calculando.set(false)))
      .subscribe({
        next: (cotizacion) => this.cotizacion.set(cotizacion),
        error: (error: unknown) =>
          this.error.set(mensajeDeError(error, 'No pudimos calcular el precio.')),
      });
  }
}
