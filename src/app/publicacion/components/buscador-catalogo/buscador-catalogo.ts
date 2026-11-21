import { Component, computed, input, model, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { hoy } from '../../../disponibilidad/utils/fechas';
import { DestinoSugerido } from '../../models/catalogo.models';
import { SelectorDestino } from '../selector-destino/selector-destino';

@Component({
  selector: 'app-buscador-catalogo',
  imports: [ReactiveFormsModule, SelectorDestino],
  templateUrl: './buscador-catalogo.html',
  styleUrl: './buscador-catalogo.css',
})
export class BuscadorCatalogo {
  readonly formulario = input.required<FormGroup>();
  readonly destinos = input<readonly DestinoSugerido[]>([]);
  readonly filtrosAvanzados = input(0);
  readonly mostrarLimpiar = input(false);
  readonly avanzada = model(false);

  readonly buscar = output<void>();
  readonly limpiar = output<void>();

  protected readonly ciudad = computed(
    () => this.formulario().controls['ciudad'] as FormControl<string>,
  );
  protected readonly minimo = hoy();
}
