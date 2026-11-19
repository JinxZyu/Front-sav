import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { ConsultaDisponibilidad } from '../../models/disponibilidad.models';
import { DisponibilidadService } from '../../services/disponibilidad.service';
import { formatearDia, hoy, rangoValido } from '../../utils/fechas';

@Component({
  selector: 'app-consulta-fechas',
  imports: [ReactiveFormsModule],
  templateUrl: './consulta-fechas.html',
  styleUrl: './consulta-fechas.css',
})
export class ConsultaFechas {
  private readonly servicio = inject(DisponibilidadService);
  private readonly destruccion = inject(DestroyRef);

  readonly idAlojamiento = input.required<string>();

  readonly formulario = inject(FormBuilder).nonNullable.group(
    {
      fechaInicio: ['', [Validators.required]],
      fechaFin: ['', [Validators.required]],
    },
    { validators: rangoValido('fechaInicio', 'fechaFin') },
  );

  readonly consultando = signal(false);
  readonly intento = signal(false);
  readonly resultado = signal<ConsultaDisponibilidad | null>(null);
  readonly error = signal<string | null>(null);

  readonly minimo = hoy();
  readonly dia = formatearDia;

  consultar(): void {
    this.intento.set(true);
    if (this.formulario.invalid || this.consultando()) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { fechaInicio, fechaFin } = this.formulario.getRawValue();
    this.resultado.set(null);
    this.error.set(null);
    this.consultando.set(true);
    this.servicio
      .consultar(this.idAlojamiento(), fechaInicio, fechaFin)
      .pipe(
        finalize(() => this.consultando.set(false)),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe({
        next: (resultado) => this.resultado.set(resultado),
        error: (error: unknown) =>
          this.error.set(mensajeDeError(error, 'No pudimos consultar la disponibilidad.')),
      });
  }
}
