import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SesionService } from '../../../config/auth/sesion.service';
import { inicioSegunRol } from '../../../config/rutas';
import { CampoContrasena } from '../../../shared/components/campo-contrasena/campo-contrasena';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { AutenticacionService } from '../../services/autenticacion.service';

type EstadoCuenta = 'normal' | 'desactivada' | 'sin-verificar';

const AVISOS: Record<string, string> = {
  'correo-actualizado': 'Tu correo se actualizó. Inicia sesión con tu nuevo correo.',
  'cuenta-desactivada':
    'Tu cuenta fue desactivada. Si quieres volver, inicia sesión y podrás reactivarla.',
};

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, CampoContrasena],
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
  readonly aviso = signal<string | null>(
    AVISOS[this.ruta.snapshot.queryParamMap.get('aviso') ?? ''] ?? null,
  );
  readonly estadoCuenta = signal<EstadoCuenta>('normal');

  readonly formulario = inject(FormBuilder).nonNullable.group({
    correo: [
      this.ruta.snapshot.queryParamMap.get('correo') ?? '',
      [Validators.required, Validators.email],
    ],
    contrasena: ['', [Validators.required]],
  });

  constructor() {
    this.formulario.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.estadoCuenta() !== 'normal') {
        this.estadoCuenta.set('normal');
        this.error.set(null);
      }
    });
  }

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

    const usadas = this.credenciales();
    this.enviando.set(true);
    this.autenticacion
      .iniciarSesion(usadas)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ token }) => {
          this.enviando.set(false);
          this.sesion.iniciar(token);
          void this.router.navigateByUrl(this.destinoSeguro());
        },
        error: (error: unknown) => {
          this.enviando.set(false);
          if (this.siguenIguales(usadas)) {
            this.manejarError(error);
          }
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

  private destinoSeguro(): string {
    const inicio = inicioSegunRol(this.sesion.rol());
    if (this.sesion.tieneRol('ANFITRION')) {
      return inicio;
    }
    const destino = this.ruta.snapshot.queryParamMap.get('volverA');
    if (!destino?.startsWith('/') || destino.startsWith('//')) {
      return inicio;
    }
    const esCatalogo = destino === '/publicaciones' || destino.startsWith('/publicaciones/');
    return esCatalogo && !this.sesion.tieneRol('HUESPED') ? inicio : destino;
  }

  private siguenIguales(usadas: { correo: string; contrasena: string }): boolean {
    const actuales = this.credenciales();
    return actuales.correo === usadas.correo && actuales.contrasena === usadas.contrasena;
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
