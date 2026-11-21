import { Component, ResourceRef, computed, input, model, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  ServicioDisponible,
  TIPOS_ALOJAMIENTO,
} from '../../../alojamiento/models/alojamiento.models';
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
  readonly servicios = input.required<ResourceRef<ServicioDisponible[] | undefined>>();
  readonly filtrosAvanzados = input(0);
  readonly mostrarLimpiar = input(false);
  readonly avanzada = model(false);

  readonly buscar = output<void>();
  readonly limpiar = output<void>();

  protected readonly ciudad = computed(
    () => this.formulario().controls['ciudad'] as FormControl<string>,
  );
  protected readonly tipos = TIPOS_ALOJAMIENTO;
  protected readonly minimo = hoy();

  protected marcado(idServicio: string): boolean {
    return (this.formulario().controls['servicios'].value as string[]).includes(idServicio);
  }

  protected alternarServicio(idServicio: string): void {
    const control = this.formulario().controls['servicios'];
    const actuales = control.value as string[];
    control.setValue(
      actuales.includes(idServicio)
        ? actuales.filter((actual) => actual !== idServicio)
        : [...actuales, idServicio],
    );
  }
}
