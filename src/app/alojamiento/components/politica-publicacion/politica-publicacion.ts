import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { formatearPorcentaje } from '../../models/alojamiento.models';
import { PublicacionAlojamientoService } from '../../services/publicacion-alojamiento.service';
import { AvisosService } from '../../../shared/services/avisos.service';

@Component({
  selector: 'app-politica-publicacion',
  imports: [NgTemplateOutlet],
  templateUrl: './politica-publicacion.html',
  styleUrl: '../../styles/configuracion.css',
})
export class PoliticaPublicacion {
  private readonly servicio = inject(PublicacionAlojamientoService);
  private readonly avisos = inject(AvisosService);
  private readonly destruccion = inject(DestroyRef);

  readonly idPublicacion = input.required<string>();
  readonly editable = input(true);
  readonly guardado = output();

  readonly actual = rxResource({
    params: () => this.idPublicacion(),
    stream: ({ params }) => this.servicio.politicaDe(params),
  });

  readonly editando = linkedSignal({ source: this.editable, computation: () => false });
  readonly opciones = rxResource({
    params: () => (this.editando() ? true : undefined),
    stream: () => this.servicio.politicas(),
  });

  readonly seleccion = signal('');
  readonly seleccionValida = computed(() => {
    const idPolitica = this.seleccion();
    return (
      this.opciones.hasValue() &&
      this.opciones.value().some((politica) => politica.idPolitica === idPolitica)
    );
  });
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly errorCarga = computed(() =>
    this.actual.status() === 'error'
      ? mensajeDeError(this.actual.error(), 'No pudimos consultar la política de cancelación.')
      : null,
  );

  readonly errorOpciones = computed(() =>
    this.opciones.status() === 'error'
      ? mensajeDeError(this.opciones.error(), 'No pudimos cargar las políticas disponibles.')
      : null,
  );

  readonly porcentaje = formatearPorcentaje;

  cambiar(): void {
    this.seleccion.set(this.actual.hasValue() ? this.actual.value().idPolitica : '');
    this.error.set(null);
    this.editando.set(true);
  }

  cancelar(): void {
    this.editando.set(false);
    this.error.set(null);
  }

  guardar(): void {
    const idPolitica = this.seleccion();
    if (!this.editable() || !this.seleccionValida() || this.guardando()) {
      return;
    }
    this.error.set(null);
    this.guardando.set(true);
    this.servicio
      .cambiarPolitica(this.idPublicacion(), idPolitica)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe({
        next: (politica) => {
          this.actual.set(politica);
          this.editando.set(false);
          this.avisos.mostrar('Cambios guardados', 'Guardamos la política de cancelación.');
          this.guardado.emit();
        },
        error: (error: unknown) =>
          this.error.set(mensajeDeError(error, 'No pudimos guardar la política de cancelación.')),
      });
  }
}
