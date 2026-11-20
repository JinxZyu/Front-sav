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
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import {
  MODOS_ACEPTACION,
  ModoAceptacion,
  ModoAceptacionDePublicacion,
} from '../../models/alojamiento.models';
import { PublicacionAlojamientoService } from '../../services/publicacion-alojamiento.service';
import { AvisosService } from '../../../shared/services/avisos.service';

@Component({
  selector: 'app-modo-aceptacion-publicacion',
  templateUrl: './modo-aceptacion-publicacion.html',
  styleUrl: '../../styles/configuracion.css',
})
export class ModoAceptacionPublicacion {
  private readonly servicio = inject(PublicacionAlojamientoService);
  private readonly avisos = inject(AvisosService);
  private readonly destruccion = inject(DestroyRef);

  readonly idPublicacion = input.required<string>();
  readonly editable = input(true);
  readonly guardado = output<ModoAceptacionDePublicacion>();

  readonly modos = MODOS_ACEPTACION;

  readonly actual = rxResource({
    params: () => this.idPublicacion(),
    stream: ({ params }) => this.servicio.modoAceptacionDe(params),
  });

  readonly modoActual = computed(() => {
    const valor = this.actual.hasValue() ? this.actual.value().modoAceptacion : '';
    return MODOS_ACEPTACION.find((modo) => modo.valor === valor) ?? null;
  });

  readonly errorCarga = computed(() =>
    this.actual.status() === 'error'
      ? mensajeDeError(this.actual.error(), 'No pudimos consultar el modo de aceptación.')
      : null,
  );

  readonly editando = linkedSignal({ source: this.editable, computation: () => false });
  readonly seleccion = signal<ModoAceptacion | ''>('');
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  cambiar(): void {
    this.seleccion.set(this.modoActual()?.valor ?? '');
    this.error.set(null);
    this.editando.set(true);
  }

  cancelar(): void {
    this.editando.set(false);
    this.error.set(null);
  }

  guardar(): void {
    const modo = this.seleccion();
    if (!this.editable() || !modo || this.guardando()) {
      return;
    }
    this.error.set(null);
    this.guardando.set(true);
    this.servicio
      .cambiarModoAceptacion(this.idPublicacion(), modo)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe({
        next: (respuesta) => {
          this.actual.set(respuesta);
          this.editando.set(false);
          this.avisos.mostrar('Cambios guardados', 'Guardamos el modo de aceptación de reservas.');
          this.guardado.emit(respuesta);
        },
        error: (error: unknown) =>
          this.error.set(mensajeDeError(error, 'No pudimos guardar el modo de aceptación.')),
      });
  }
}
