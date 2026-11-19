import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { SesionService } from '../../../config/auth/sesion.service';
import { INICIO_SIN_SESION } from '../../../config/rutas';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { PATRON_CON_TEXTO } from '../../../shared/utils/validadores';
import { Cuenta, TIPOS_DOCUMENTO } from '../../models/usuario.models';
import { CuentaService } from '../../services/cuenta.service';

type Paso = 'datos' | 'codigo';

@Component({
  selector: 'app-editar-perfil',
  imports: [ReactiveFormsModule],
  templateUrl: './editar-perfil.html',
  styleUrls: ['../../../shared/styles/formulario.css', './editar-perfil.css'],
})
export class EditarPerfil implements OnInit {
  private readonly cuentaService = inject(CuentaService);
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly cuenta = input.required<Cuenta>();
  readonly cancelado = output();
  readonly guardado = output<string>();

  readonly paso = signal<Paso>('datos');
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly correoNuevo = signal('');

  readonly tipoDocumento = computed(() => {
    const tipo = this.cuenta().tipoDocumento;
    return TIPOS_DOCUMENTO.find((opcion) => opcion.valor === tipo)?.etiqueta ?? tipo;
  });

  readonly formulario = this.fb.group({
    nombre: [
      '',
      [Validators.required, Validators.pattern(PATRON_CON_TEXTO), Validators.maxLength(50)],
    ],
    apellido: [
      '',
      [Validators.required, Validators.pattern(PATRON_CON_TEXTO), Validators.maxLength(50)],
    ],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  readonly formularioCodigo = this.fb.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  ngOnInit(): void {
    const { nombre, apellido, correo } = this.cuenta();
    this.formulario.setValue({ nombre, apellido, correo });
  }

  invalido(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
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

    const valores = this.formulario.getRawValue();
    const datos = {
      nombre: valores.nombre.trim(),
      apellido: valores.apellido.trim(),
      correo: valores.correo.trim().toLowerCase(),
    };
    const cambiaCorreo = datos.correo !== this.cuenta().correo.toLowerCase();

    this.enviando.set(true);
    this.cuentaService
      .actualizarPerfil(datos)
      .pipe(
        finalize(() => this.enviando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (mensaje) => {
          if (!cambiaCorreo) {
            this.guardado.emit(mensaje || 'Perfil actualizado correctamente.');
            return;
          }
          this.cuentaService.actual.reload();
          this.correoNuevo.set(datos.correo);
          this.aviso.set(mensaje || 'Te enviamos un código al nuevo correo.');
          this.formularioCodigo.reset();
          this.paso.set('codigo');
        },
        error: (error: unknown) =>
          this.error.set(mensajeDeError(error, 'No pudimos guardar los cambios.')),
      });
  }

  confirmarCorreo(): void {
    if (this.enviando()) {
      return;
    }
    this.error.set(null);
    if (this.formularioCodigo.invalid) {
      this.formularioCodigo.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.cuentaService
      .confirmarCambioCorreo(this.formularioCodigo.controls.codigo.value)
      .pipe(
        finalize(() => this.enviando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.sesion.cerrar();
          void this.router.navigate([INICIO_SIN_SESION], {
            queryParams: { correo: this.correoNuevo(), aviso: 'correo-actualizado' },
          });
        },
        error: (error: unknown) =>
          this.error.set(mensajeDeError(error, 'No pudimos confirmar el nuevo correo.')),
      });
  }

  cancelar(): void {
    if (!this.enviando()) {
      this.cancelado.emit();
    }
  }
}
