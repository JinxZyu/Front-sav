import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PATRON_CON_TEXTO } from '../../../shared/utils/validadores';

let siguienteId = 0;

@Component({
  selector: 'app-formulario-motivo',
  imports: [ReactiveFormsModule],
  templateUrl: './formulario-motivo.html',
  styleUrl: './formulario-motivo.css',
})
export class FormularioMotivo {
  readonly etiqueta = input.required<string>();
  readonly accion = input.required<string>();
  readonly accionEnCurso = input.required<string>();
  readonly maximo = input.required<number>();
  readonly enviando = input(false);
  readonly error = input<string | null>(null);

  readonly confirmar = output<string>();
  readonly cancelar = output<void>();

  protected readonly id = `motivo-${++siguienteId}`;
  protected readonly motivo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(PATRON_CON_TEXTO)],
  });
  protected readonly formulario = new FormGroup({ motivo: this.motivo });

  private readonly texto = toSignal(this.motivo.valueChanges, { initialValue: '' });
  protected readonly largo = computed(() => this.texto().trim().length);
  protected readonly excedido = computed(() => this.largo() > this.maximo());

  private readonly campo = viewChild.required<ElementRef<HTMLTextAreaElement>>('campo');

  constructor() {
    afterNextRender(() => this.campo().nativeElement.focus());
  }

  protected invalido(): boolean {
    return this.motivo.touched && (this.motivo.invalid || this.excedido());
  }

  protected enviar(): void {
    if (this.enviando()) {
      return;
    }
    if (this.motivo.invalid || this.excedido()) {
      this.motivo.markAsTouched();
      return;
    }
    this.confirmar.emit(this.motivo.value.trim());
  }
}
