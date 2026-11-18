import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { RegistroRequest, TIPOS_DOCUMENTO } from '../../models/usuario.models';
import { AutenticacionService } from '../../services/autenticacion.service';

const PATRON_TELEFONO = /^\+?\d{7,15}$/;
const PATRON_CON_TEXTO = /\S/;
const PATRON_DOCUMENTO = /^[A-Za-z0-9]{5,20}$/;

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrl: '../../../shared/styles/formulario.css',
})
export class Registro {
  private readonly autenticacion = inject(AutenticacionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly tiposDocumento = TIPOS_DOCUMENTO;
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  readonly formulario = inject(FormBuilder).nonNullable.group({
    nombre: [
      '',
      [Validators.required, Validators.pattern(PATRON_CON_TEXTO), Validators.maxLength(50)],
    ],
    apellido: [
      '',
      [Validators.required, Validators.pattern(PATRON_CON_TEXTO), Validators.maxLength(50)],
    ],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    tipoDocumento: ['CC', [Validators.required]],
    documentoIdentidad: ['', [Validators.required, Validators.pattern(PATRON_DOCUMENTO)]],
    telefono: ['', [Validators.required, Validators.pattern(PATRON_TELEFONO)]],
    contrasena: ['', [Validators.required, Validators.minLength(8)]],
    rol: ['HUESPED' as RegistroRequest['rol'], [Validators.required]],
  });

  invalido(campo: keyof typeof this.formulario.controls): boolean {
    const control = this.formulario.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  registrar(): void {
    this.error.set(null);
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const datos = this.formulario.getRawValue();
    const solicitud: RegistroRequest = {
      ...datos,
      nombre: datos.nombre.trim(),
      apellido: datos.apellido.trim(),
      correo: datos.correo.trim().toLowerCase(),
      telefono: datos.telefono.trim(),
      documentoIdentidad: datos.documentoIdentidad.trim(),
    };

    this.enviando.set(true);
    this.autenticacion
      .registrar(solicitud)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          void this.router.navigate(['/usuario/verificar-correo'], {
            queryParams: { correo: solicitud.correo },
          });
        },
        error: (error: unknown) => {
          this.enviando.set(false);
          this.error.set(this.mensajeRegistro(error));
        },
      });
  }

  private mensajeRegistro(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return (
        'No se pudo crear la cuenta. Es posible que el correo, el teléfono o el documento ' +
        'ya estén registrados. Usa otros datos o inicia sesión.'
      );
    }
    return mensajeDeError(error);
  }
}
