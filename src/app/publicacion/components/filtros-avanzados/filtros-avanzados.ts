import { Component, ResourceRef, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  ServicioDisponible,
  TIPOS_ALOJAMIENTO,
} from '../../../alojamiento/models/alojamiento.models';

@Component({
  selector: 'app-filtros-avanzados',
  imports: [ReactiveFormsModule],
  templateUrl: './filtros-avanzados.html',
  styleUrl: './filtros-avanzados.css',
})
export class FiltrosAvanzados {
  readonly formulario = input.required<FormGroup>();
  readonly servicios = input.required<ResourceRef<ServicioDisponible[] | undefined>>();

  readonly aplicar = output<void>();

  protected readonly tipos = TIPOS_ALOJAMIENTO;

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
