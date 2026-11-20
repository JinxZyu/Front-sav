import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { CALIFICACIONES, ResenaCreada } from '../../models/resena.models';
import { ResenaService } from '../../services/resena.service';

const MAXIMO_COMENTARIO = 5000;

@Component({
  selector: 'app-formulario-resena',
  imports: [ReactiveFormsModule],
  templateUrl: './formulario-resena.html',
  styleUrl: './formulario-resena.css',
})
export class FormularioResena {
  private readonly servicio = inject(ResenaService);

  readonly idReserva = input.required<string>();
  readonly creada = output<ResenaCreada>();
  readonly conflicto = output<void>();

  protected readonly calificaciones = CALIFICACIONES;
  protected readonly maximo = MAXIMO_COMENTARIO;
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    calificacion: [0, [Validators.min(1), Validators.max(5)]],
    comentario: ['', [Validators.required, Validators.maxLength(MAXIMO_COMENTARIO)]],
  });

  protected invalido(campo: 'calificacion' | 'comentario'): boolean {
    const control = this.formulario.controls[campo];
    return control.touched && control.invalid;
  }

  protected enviar(): void {
    const comentario = this.formulario.controls.comentario;
    if (!comentario.value.trim()) {
      comentario.setErrors({ required: true });
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { calificacion } = this.formulario.getRawValue();
    this.enviando.set(true);
    this.error.set(null);
    this.servicio
      .crear(this.idReserva(), { calificacion, comentario: comentario.value.trim() })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (resena) => this.creada.emit(resena),
        error: (error: unknown) => {
          this.error.set(mensajeDeError(error, 'No pudimos publicar tu reseña.'));
          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.conflicto.emit();
          }
        },
      });
  }
}
