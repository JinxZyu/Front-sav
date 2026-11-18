import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CampoContrasena } from '../../../shared/components/campo-contrasena/campo-contrasena';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import {
  INDICATIVOS_TELEFONO,
  INDICATIVO_POR_DEFECTO,
  ejemploTelefono,
  telefonoInternacional,
  telefonoValido,
} from '../../../shared/utils/telefono';
import { RegistroRequest, TIPOS_DOCUMENTO } from '../../models/usuario.models';
import { AutenticacionService } from '../../services/autenticacion.service';

const PATRON_CON_TEXTO = /\S/;
const PATRON_DOCUMENTO = /^[A-Za-z0-9]{5,20}$/;

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, CampoContrasena],
  templateUrl: './registro.html',
  styleUrl: '../../../shared/styles/formulario.css',
})
export class Registro {
  private readonly autenticacion = inject(AutenticacionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly tiposDocumento = TIPOS_DOCUMENTO;
  readonly indicativos = INDICATIVOS_TELEFONO;
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
    indicativo: [INDICATIVO_POR_DEFECTO, [Validators.required]],
    telefono: ['', [Validators.required, telefonoValido('indicativo')]],
    contrasena: ['', [Validators.required, Validators.minLength(8)]],
    rol: ['HUESPED' as RegistroRequest['rol'], [Validators.required]],
  });

  private readonly indicativo = toSignal(this.formulario.controls.indicativo.valueChanges, {
    initialValue: this.formulario.controls.indicativo.value,
  });
  readonly ejemplo = computed(() => ejemploTelefono(this.indicativo()));

  constructor() {
    this.formulario.controls.indicativo.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.formulario.controls.telefono.updateValueAndValidity());
  }

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

    const { indicativo, ...datos } = this.formulario.getRawValue();
    const solicitud: RegistroRequest = {
      ...datos,
      nombre: datos.nombre.trim(),
      apellido: datos.apellido.trim(),
      correo: datos.correo.trim().toLowerCase(),
      telefono: telefonoInternacional(datos.telefono, indicativo) ?? datos.telefono.trim(),
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
    if (error instanceof HttpErrorResponse && error.status === 401) {
      return 'No pudimos crear la cuenta por un problema del servidor. Intenta de nuevo en un momento.';
    }
    return mensajeDeError(error);
  }
}
