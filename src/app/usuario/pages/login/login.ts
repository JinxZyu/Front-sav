import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SesionService } from '../../../config/auth/sesion.service';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { AutenticacionService } from '../../services/autenticacion.service';

type EstadoCuenta = 'normal' | 'desactivada' | 'sin-verificar';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: '../../../shared/styles/formulario.css',
})
export class Login {
  private readonly autenticacion = inject(AutenticacionService);
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly estadoCuenta = signal<EstadoCuenta>('normal');

  readonly formulario = inject(FormBuilder).nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required]],
  });

  invalido(campo: 'correo' | 'contrasena'): boolean {
    const control = this.formulario.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  iniciarSesion(): void {
    this.limpiarMensajes();
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.autenticacion
      .iniciarSesion(this.credenciales())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ token }) => {
          this.enviando.set(false);
          this.sesion.iniciar(token);
          const destino = this.ruta.snapshot.queryParamMap.get('volverA') ?? '/';
          void this.router.navigateByUrl(destino);
        },
        error: (error: unknown) => {
          this.enviando.set(false);
          this.manejarError(error);
        },
      });
  }

  reactivar(): void {
    this.limpiarMensajes();
    this.enviando.set(true);
    this.autenticacion
      .reactivarCuenta(this.credenciales())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (mensaje) => {
          this.enviando.set(false);
          this.estadoCuenta.set('normal');
          this.aviso.set(mensaje || 'Tu cuenta fue reactivada. Inicia sesión nuevamente.');
        },
        error: (error: unknown) => {
          this.enviando.set(false);
          this.estadoCuenta.set('normal');
          this.error.set(mensajeDeError(error));
        },
      });
  }

  irAVerificar(): void {
    void this.router.navigate(['/usuario/verificar-correo'], {
      queryParams: { correo: this.credenciales().correo },
    });
  }

  private credenciales() {
    const { correo, contrasena } = this.formulario.getRawValue();
    return { correo: correo.trim().toLowerCase(), contrasena };
  }

  private limpiarMensajes(): void {
    this.error.set(null);
    this.aviso.set(null);
    this.estadoCuenta.set('normal');
  }

  private manejarError(error: unknown): void {
    const mensaje = mensajeDeError(error);
    if (error instanceof HttpErrorResponse && error.status === 403) {
      const texto = mensaje.toLowerCase();
      if (texto.includes('desactivada')) {
        this.estadoCuenta.set('desactivada');
        return;
      }
      if (texto.includes('verificar tu correo')) {
        this.estadoCuenta.set('sin-verificar');
        return;
      }
    }
    if (error instanceof HttpErrorResponse && error.status === 400) {
      this.error.set('Revisa el correo y la contraseña.');
      return;
    }
    this.error.set(mensaje);
  }
}
