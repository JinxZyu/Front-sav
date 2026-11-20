import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TIPOS_DOCUMENTO } from '../../../usuario/models/usuario.models';
import { NuevoDocumento } from '../../models/usuario-administrado.models';

const PATRON_DOCUMENTO = /^\s*[A-Za-z0-9]{5,20}\s*$/;

let siguienteId = 0;

@Component({
  selector: 'app-formulario-documento',
  imports: [ReactiveFormsModule],
  templateUrl: './formulario-documento.html',
  styleUrl: './formulario-documento.css',
})
export class FormularioDocumento {
  readonly enviando = input(false);
  readonly error = input<string | null>(null);

  readonly confirmar = output<NuevoDocumento>();
  readonly cancelar = output<void>();

  protected readonly id = `documento-${++siguienteId}`;
  protected readonly tipos = TIPOS_DOCUMENTO;
  protected readonly formulario = new FormGroup({
    tipoDocumento: new FormControl('CC', { nonNullable: true, validators: Validators.required }),
    documentoIdentidad: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(PATRON_DOCUMENTO)],
    }),
  });

  private readonly campo = viewChild.required<ElementRef<HTMLSelectElement>>('campo');

  constructor() {
    afterNextRender(() => this.campo().nativeElement.focus());
  }

  protected invalido(): boolean {
    const numero = this.formulario.controls.documentoIdentidad;
    return numero.touched && numero.invalid;
  }

  protected enviar(): void {
    if (this.enviando()) {
      return;
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { tipoDocumento, documentoIdentidad } = this.formulario.getRawValue();
    this.confirmar.emit({ tipoDocumento, documentoIdentidad: documentoIdentidad.trim() });
  }
}
