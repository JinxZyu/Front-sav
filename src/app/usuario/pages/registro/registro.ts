import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { distinctUntilChanged } from 'rxjs';
import { CampoContrasena } from '../../../shared/components/campo-contrasena/campo-contrasena';
import { PAIS_POR_DEFECTO } from '../../../shared/models/ubicacion.models';
import { UbicacionService } from '../../../shared/services/ubicacion.service';
import { PATRON_CON_TEXTO } from '../../../shared/utils/validadores';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import {
  INDICATIVOS_TELEFONO,
  INDICATIVO_POR_DEFECTO,
  ejemploTelefono,
  indicativoDePais,
  telefonoInternacional,
  telefonoValido,
} from '../../../shared/utils/telefono';
import { RegistroRequest, TIPOS_DOCUMENTO } from '../../models/usuario.models';
import { AutenticacionService } from '../../services/autenticacion.service';

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
  private readonly ubicacion = inject(UbicacionService);

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
    idPais: ['', [Validators.required]],
    idCiudad: ['', [Validators.required]],
    contrasena: ['', [Validators.required, Validators.minLength(8)]],
    rol: ['HUESPED' as RegistroRequest['rol'], [Validators.required]],
  });

  private readonly indicativo = toSignal(this.formulario.controls.indicativo.valueChanges, {
    initialValue: this.formulario.controls.indicativo.value,
  });
  readonly ejemplo = computed(() => ejemploTelefono(this.indicativo()));

  private readonly idPais = toSignal(this.formulario.controls.idPais.valueChanges, {
    initialValue: '',
  });

  readonly paises = rxResource({ stream: () => this.ubicacion.paises() });

  readonly ciudades = rxResource({
    params: () => this.idPais() || undefined,
    stream: ({ params }) => this.ubicacion.ciudades(params),
  });

  readonly listaPaises = computed(() => (this.paises.hasValue() ? this.paises.value() : []));
  readonly listaCiudades = computed(() => (this.ciudades.hasValue() ? this.ciudades.value() : []));

  readonly errorPaises = computed(() =>
    this.paises.status() === 'error'
      ? mensajeDeError(this.paises.error(), 'No pudimos cargar los países.')
      : null,
  );

  readonly errorCiudades = computed(() =>
    this.ciudades.status() === 'error'
      ? mensajeDeError(this.ciudades.error(), 'No pudimos cargar las ciudades.')
      : null,
  );

  constructor() {
    this.formulario.controls.indicativo.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.formulario.controls.telefono.updateValueAndValidity());

    this.formulario.controls.idPais.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((idPais) => this.alCambiarPais(idPais));

    effect(() => {
      const paises = this.listaPaises();
      untracked(() => {
        const control = this.formulario.controls.idPais;
        const porDefecto = paises.find((pais) => pais.codigoIso2 === PAIS_POR_DEFECTO);
        if (!control.value && porDefecto) {
          control.setValue(porDefecto.idPais);
        }
      });
    });
  }

  private alCambiarPais(idPais: string): void {
    this.formulario.controls.idCiudad.setValue('');
    const pais = this.listaPaises().find((opcion) => opcion.idPais === idPais);
    const indicativo = pais ? indicativoDePais(pais.codigoIso2) : null;
    const control = this.formulario.controls.indicativo;
    if (
      indicativo &&
      control.pristine &&
      this.indicativos.some((o) => o.indicativo === indicativo)
    ) {
      control.setValue(indicativo);
    }
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

    const datos = this.formulario.getRawValue();
    const solicitud: RegistroRequest = {
      nombre: datos.nombre.trim(),
      apellido: datos.apellido.trim(),
      correo: datos.correo.trim().toLowerCase(),
      tipoDocumento: datos.tipoDocumento,
      documentoIdentidad: datos.documentoIdentidad.trim(),
      telefono: telefonoInternacional(datos.telefono, datos.indicativo) ?? datos.telefono.trim(),
      contrasena: datos.contrasena,
      idCiudad: datos.idCiudad,
      rol: datos.rol,
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
