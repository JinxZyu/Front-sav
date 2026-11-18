import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CampoContrasena } from '../../../shared/components/campo-contrasena/campo-contrasena';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { AutenticacionService } from '../../services/autenticacion.service';

type Paso = 'correo' | 'codigo' | 'listo';

const contrasenasIguales = (grupo: AbstractControl): ValidationErrors | null => {
  const nueva = grupo.get('nuevaContrasena')?.value;
  const confirmacion = grupo.get('confirmacion')?.value;
  return nueva && confirmacion && nueva !== confirmacion ? { noCoinciden: true } : null;
};

@Component({
  selector: 'app-recuperar-contrasena',
  imports: [ReactiveFormsModule, RouterLink, CampoContrasena],
  templateUrl: './recuperar-contrasena.html',
  styleUrl: '../../../shared/styles/formulario.css',
})
export class RecuperarContrasena {
  private readonly autenticacion = inject(AutenticacionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly paso = signal<Paso>('correo');
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly codigoRechazado = signal(false);
  readonly correoSolicitado = signal('');

  readonly formularioCorreo = this.fb.group({
    correo: [
      inject(ActivatedRoute).snapshot.queryParamMap.get('correo') ?? '',
      [Validators.required, Validators.email],
    ],
  });

  readonly formularioCodigo = this.fb.group(
    {
      codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      nuevaContrasena: ['', [Validators.required, Validators.minLength(8)]],
      confirmacion: ['', [Validators.required]],
    },
    { validators: contrasenasIguales },
  );

  invalido(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  noCoinciden(): boolean {
    const confirmacion = this.formularioCodigo.controls.confirmacion;
    return (
      this.formularioCodigo.hasError('noCoinciden') && (confirmacion.touched || confirmacion.dirty)
    );
  }

  solicitarCodigo(): void {
    if (this.enviando()) {
      return;
    }
    this.limpiarMensajes();
    if (this.formularioCorreo.invalid) {
      this.formularioCorreo.markAllAsTouched();
      return;
    }
    this.enviarSolicitud(this.formularioCorreo.controls.correo.value.trim().toLowerCase());
  }

  pedirOtroCodigo(): void {
    if (this.enviando()) {
      return;
    }
    this.limpiarMensajes();
    this.formularioCodigo.controls.codigo.reset();
    this.enviarSolicitud(this.correoSolicitado());
  }

  usarOtroCorreo(): void {
    if (this.enviando()) {
      return;
    }
    this.limpiarMensajes();
    this.formularioCodigo.reset();
    this.paso.set('correo');
  }

  restablecer(): void {
    if (this.enviando()) {
      return;
    }
    this.limpiarMensajes();
    if (this.formularioCodigo.invalid) {
      this.formularioCodigo.markAllAsTouched();
      return;
    }
    const { codigo, nuevaContrasena } = this.formularioCodigo.getRawValue();
    this.enviando.set(true);
    this.autenticacion
      .restablecerContrasena({ correo: this.correoSolicitado(), codigo, nuevaContrasena })
      .pipe(
        finalize(() => this.enviando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ mensaje }) => {
          this.aviso.set(mensaje || 'Tu contraseña se actualizó correctamente.');
          this.paso.set('listo');
        },
        error: (error: unknown) => {
          const rechazado =
            error instanceof HttpErrorResponse && error.status === HttpStatusCode.BadRequest;
          this.codigoRechazado.set(rechazado);
          this.error.set(
            rechazado
              ? mensajeDeError(error, 'El código es inválido o ya venció. Solicita uno nuevo.')
              : mensajeDeError(
                  error,
                  'No pudimos cambiar tu contraseña. Intenta de nuevo en un momento.',
                ),
          );
        },
      });
  }

  private enviarSolicitud(correo: string): void {
    this.enviando.set(true);
    this.autenticacion
      .solicitarRecuperacion(correo)
      .pipe(
        finalize(() => this.enviando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ mensaje }) => {
          this.correoSolicitado.set(correo);
          this.aviso.set(mensaje || 'Si el correo está registrado, te enviamos un código.');
          this.paso.set('codigo');
        },
        error: (error: unknown) => {
          this.error.set(
            mensajeDeError(error, 'No pudimos enviar el código. Intenta de nuevo en un momento.'),
          );
        },
      });
  }

  private limpiarMensajes(): void {
    this.error.set(null);
    this.aviso.set(null);
    this.codigoRechazado.set(false);
  }
}
