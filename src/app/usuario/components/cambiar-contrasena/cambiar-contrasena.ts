import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { CampoContrasena } from '../../../shared/components/campo-contrasena/campo-contrasena';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { contrasenasIguales } from '../../../shared/utils/validadores';
import { CuentaService } from '../../services/cuenta.service';

@Component({
  selector: 'app-cambiar-contrasena',
  imports: [ReactiveFormsModule, CampoContrasena],
  templateUrl: './cambiar-contrasena.html',
  styleUrls: ['../../../shared/styles/formulario.css', './cambiar-contrasena.css'],
})
export class CambiarContrasena {
  private readonly cuentaService = inject(CuentaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly abierto = signal(false);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly formulario = inject(FormBuilder).nonNullable.group(
    {
      contrasenaActual: ['', [Validators.required]],
      nuevaContrasena: ['', [Validators.required, Validators.minLength(8)]],
      confirmacion: ['', [Validators.required]],
    },
    { validators: contrasenasIguales },
  );

  invalido(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  noCoinciden(): boolean {
    const confirmacion = this.formulario.controls.confirmacion;
    return this.formulario.hasError('noCoinciden') && (confirmacion.touched || confirmacion.dirty);
  }

  abrir(): void {
    this.aviso.set(null);
    this.error.set(null);
    this.formulario.reset();
    this.abierto.set(true);
  }

  cancelar(): void {
    if (!this.enviando()) {
      this.abierto.set(false);
    }
  }

  guardar(): void {
    if (this.enviando()) {
      return;
    }
    this.error.set(null);
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { contrasenaActual, nuevaContrasena } = this.formulario.getRawValue();
    this.enviando.set(true);
    this.cuentaService
      .cambiarContrasena({ contrasenaActual, nuevaContrasena })
      .pipe(
        finalize(() => this.enviando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (mensaje) => {
          this.formulario.reset();
          this.abierto.set(false);
          this.aviso.set(mensaje || 'La contraseña se actualizó correctamente.');
        },
        error: (error: unknown) =>
          this.error.set(mensajeDeError(error, 'No pudimos cambiar la contraseña.')),
      });
  }
}
