import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { AutenticacionService } from '../../services/autenticacion.service';

export const ESPERA_REENVIO_SEGUNDOS = 60;

@Component({
  selector: 'app-verificar-correo',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './verificar-correo.html',
  styleUrl: '../../../shared/styles/formulario.css',
})
export class VerificarCorreo {
  private readonly autenticacion = inject(AutenticacionService);
  private intervalo: ReturnType<typeof setInterval> | null = null;

  readonly enviando = signal(false);
  readonly verificado = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly segundosParaReenviar = signal(ESPERA_REENVIO_SEGUNDOS);

  readonly formulario = inject(FormBuilder).nonNullable.group({
    correo: [
      inject(ActivatedRoute).snapshot.queryParamMap.get('correo') ?? '',
      [Validators.required, Validators.email],
    ],
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor() {
    this.iniciarCuentaRegresiva();
    inject(DestroyRef).onDestroy(() => this.detenerCuentaRegresiva());
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
    this.autenticacion.confirmarCodigo(correo.trim(), codigo).subscribe({
      next: () => {
        this.enviando.set(false);
        this.verificado.set(true);
        this.detenerCuentaRegresiva();
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(error, 'El código no es válido o ya venció.'));
      },
    });
  }

  reenviar(): void {
    this.error.set(null);
    this.aviso.set(null);
    const correo = this.formulario.controls.correo;
    if (correo.invalid) {
      correo.markAsTouched();
      return;
    }

    this.autenticacion.reenviarCodigo(correo.value.trim()).subscribe({
      next: (mensaje) => {
        this.aviso.set(mensaje || 'Te enviamos un nuevo código.');
        this.formulario.controls.codigo.reset();
        this.iniciarCuentaRegresiva();
      },
      error: (error: unknown) => this.error.set(mensajeDeError(error)),
    });
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

  private detenerCuentaRegresiva(): void {
    if (this.intervalo !== null) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }
  }
}
