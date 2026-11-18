import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { AutenticacionService } from '../../services/autenticacion.service';

export const ESPERA_REENVIO_SEGUNDOS = 60;
export const ESPERA_REDIRECCION_SEGUNDOS = 5;

@Component({
  selector: 'app-verificar-correo',
  imports: [ReactiveFormsModule],
  templateUrl: './verificar-correo.html',
  styleUrl: '../../../shared/styles/formulario.css',
})
export class VerificarCorreo {
  private readonly autenticacion = inject(AutenticacionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private intervalo: ReturnType<typeof setInterval> | null = null;
  private redireccion: ReturnType<typeof setInterval> | null = null;

  readonly enviando = signal(false);
  readonly reenviando = signal(false);
  readonly verificado = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly segundosParaReenviar = signal(ESPERA_REENVIO_SEGUNDOS);
  readonly segundosParaIniciarSesion = signal(ESPERA_REDIRECCION_SEGUNDOS);
  readonly correoVerificado = signal('');

  readonly formulario = inject(FormBuilder).nonNullable.group({
    correo: [
      inject(ActivatedRoute).snapshot.queryParamMap.get('correo') ?? '',
      [Validators.required, Validators.email],
    ],
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor() {
    this.iniciarCuentaRegresiva();
    this.destroyRef.onDestroy(() => {
      this.detenerCuentaRegresiva();
      this.detenerRedireccion();
    });
  }

  invalido(campo: 'correo' | 'codigo'): boolean {
    const control = this.formulario.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  verificar(): void {
    this.error.set(null);
    this.aviso.set(null);
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { correo, codigo } = this.formulario.getRawValue();
    this.enviando.set(true);
    this.autenticacion
      .confirmarCodigo(correo.trim(), codigo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.verificado.set(true);
          this.correoVerificado.set(correo.trim());
          this.iniciarRedireccion();
        },
        error: (error: unknown) => {
          this.enviando.set(false);
          this.error.set(mensajeDeError(error, 'El código no es válido o ya venció.'));
        },
      });
  }

  reenviar(): void {
    if (this.reenviando()) {
      return;
    }
    this.error.set(null);
    this.aviso.set(null);
    const correo = this.formulario.controls.correo;
    if (correo.invalid) {
      correo.markAsTouched();
      return;
    }

    this.reenviando.set(true);
    this.autenticacion
      .reenviarCodigo(correo.value.trim())
      .pipe(
        finalize(() => this.reenviando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (mensaje) => {
          this.aviso.set(mensaje || 'Te enviamos un nuevo código.');
          if (this.verificado()) {
            return;
          }
          this.formulario.controls.codigo.reset();
          this.iniciarCuentaRegresiva();
        },
        error: (error: unknown) => this.error.set(mensajeDeError(error)),
      });
  }

  irAIniciarSesion(): void {
    this.detenerRedireccion();
    void this.router.navigate(['/usuario/login'], {
      queryParams: { correo: this.correoVerificado() },
    });
  }

  private iniciarRedireccion(): void {
    this.detenerCuentaRegresiva();
    this.detenerRedireccion();
    this.segundosParaIniciarSesion.set(ESPERA_REDIRECCION_SEGUNDOS);
    this.redireccion = setInterval(() => {
      const restantes = this.segundosParaIniciarSesion() - 1;
      this.segundosParaIniciarSesion.set(restantes);
      if (restantes <= 0) {
        this.irAIniciarSesion();
      }
    }, 1000);
  }

  private iniciarCuentaRegresiva(): void {
    this.detenerCuentaRegresiva();
    this.segundosParaReenviar.set(ESPERA_REENVIO_SEGUNDOS);
    this.intervalo = setInterval(() => {
      const restantes = this.segundosParaReenviar() - 1;
      this.segundosParaReenviar.set(restantes);
      if (restantes <= 0) {
        this.detenerCuentaRegresiva();
      }
    }, 1000);
  }

  private detenerRedireccion(): void {
    if (this.redireccion !== null) {
      clearInterval(this.redireccion);
      this.redireccion = null;
    }
  }

  private detenerCuentaRegresiva(): void {
    if (this.intervalo !== null) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }
  }
}
