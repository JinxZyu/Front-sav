import { Component, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
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

@Component({
  selector: 'app-cotizador',
  imports: [ReactiveFormsModule],
  templateUrl: './cotizador.html',
  styleUrl: './cotizador.css',
})
export class Cotizador implements OnInit {
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
      huespedes: [1, [Validators.required, Validators.min(1)]],
      adicionales: [[] as string[]],
    },
    { validators: rangoValido('llegada', 'salida') },
  );

  protected readonly pesos = formatearPesos;
  protected readonly porcentaje = formatearPorcentaje;
  protected readonly moverDias = moverDias;

  constructor() {
    this.formulario.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.cotizacion.set(null);
      this.error.set(null);
    });
  }

  ngOnInit(): void {
    const capacidad = this.publicacion().capacidad;
    this.formulario.controls.huespedes.addValidators(Validators.max(capacidad));
    const huespedes = Number(this.huespedes());
    this.formulario.setValue({
      llegada: this.llegada(),
      salida: this.salida(),
      huespedes: Number.isInteger(huespedes) && huespedes > 0 ? Math.min(huespedes, capacidad) : 1,
      adicionales: [],
    });
    if (this.formulario.valid) {
      this.cotizar();
    }
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
    this.calculando.set(true);
    this.error.set(null);
    this.servicio
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
