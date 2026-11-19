import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, finalize, map } from 'rxjs';
import { PublicacionAlojamientoService } from '../../../alojamiento/services/publicacion-alojamiento.service';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { CalendarioDisponibilidad } from '../../components/calendario-disponibilidad/calendario-disponibilidad';
import { ConsultaFechas } from '../../components/consulta-fechas/consulta-fechas';
import { NuevoPeriodo, PeriodoDisponible } from '../../models/disponibilidad.models';
import { DisponibilidadService } from '../../services/disponibilidad.service';
import { desdeHoy, formatearDia, hoy, noches, rangoValido } from '../../utils/fechas';

@Component({
  selector: 'app-disponibilidad-alojamiento',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgTemplateOutlet,
    CalendarioDisponibilidad,
    ConsultaFechas,
  ],
  templateUrl: './disponibilidad-alojamiento.html',
  styleUrl: './disponibilidad-alojamiento.css',
})
export class DisponibilidadAlojamiento {
  private readonly publicaciones = inject(PublicacionAlojamientoService);
  private readonly disponibilidad = inject(DisponibilidadService);
  private readonly destruccion = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly idPublicacion = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((parametros) => parametros.get('idPublicacion') ?? ''),
    ),
    { initialValue: '' },
  );

  readonly publicacion = rxResource({
    params: () => this.idPublicacion() || undefined,
    stream: ({ params }) => this.publicaciones.detalle(params),
  });

  readonly idAlojamiento = computed(() =>
    this.publicacion.hasValue() ? this.publicacion.value().idAlojamiento : undefined,
  );

  readonly periodos = rxResource({
    params: () => this.idAlojamiento(),
    stream: ({ params }) => this.disponibilidad.periodos(params),
  });

  readonly lista = computed(() =>
    this.periodos.hasValue()
      ? [...this.periodos.value()].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
      : [],
  );

  readonly noEncontrada = computed(() => {
    const error = this.publicacion.status() === 'error' ? this.publicacion.error() : null;
    return error instanceof HttpErrorResponse && [400, 403, 404].includes(error.status);
  });

  readonly errorCarga = computed(() => {
    if (this.publicacion.status() === 'error' && !this.noEncontrada()) {
      return mensajeDeError(this.publicacion.error(), 'No pudimos consultar la publicación.');
    }
    return this.periodos.status() === 'error'
      ? mensajeDeError(this.periodos.error(), 'No pudimos consultar los periodos disponibles.')
      : null;
  });

  readonly nuevo = this.fb.group(
    {
      fechaInicio: ['', [Validators.required, desdeHoy]],
      fechaFin: ['', [Validators.required]],
    },
    { validators: rangoValido('fechaInicio', 'fechaFin') },
  );

  readonly edicion = this.fb.group(
    {
      fechaInicio: ['', [Validators.required]],
      fechaFin: ['', [Validators.required]],
    },
    { validators: rangoValido('fechaInicio', 'fechaFin') },
  );

  readonly editando = signal<string | null>(null);
  readonly confirmando = signal<string | null>(null);
  readonly procesando = signal(false);
  readonly intentoNuevo = signal(false);
  readonly intentoEdicion = signal(false);
  readonly aviso = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly lugarMensaje = signal<string>('nuevo');
  readonly actualizacion = signal(0);

  readonly minimo = hoy();
  readonly dia = formatearDia;
  readonly noches = noches;

  reintentar(): void {
    if (this.publicacion.status() === 'error') {
      this.publicacion.reload();
    } else {
      this.periodos.reload();
    }
  }

  agregar(): void {
    this.intentoNuevo.set(true);
    const idAlojamiento = this.idAlojamiento();
    if (this.nuevo.invalid || !idAlojamiento) {
      this.nuevo.markAllAsTouched();
      return;
    }
    this.ejecutar(
      this.disponibilidad.crearPeriodo(idAlojamiento, this.nuevo.getRawValue()),
      'nuevo',
      'Agregamos el periodo disponible.',
      'No pudimos agregar el periodo.',
      (periodo) => {
        this.periodos.update((lista) => [...(lista ?? []), periodo]);
        this.nuevo.reset();
        this.intentoNuevo.set(false);
      },
    );
  }

  editar(periodo: PeriodoDisponible): void {
    this.edicion.reset({ fechaInicio: periodo.fechaInicio, fechaFin: periodo.fechaFin });
    this.intentoEdicion.set(false);
    this.confirmando.set(null);
    this.limpiarMensajes();
    this.editando.set(periodo.idPeriodo);
  }

  cancelarEdicion(): void {
    this.editando.set(null);
  }

  guardarEdicion(periodo: PeriodoDisponible): void {
    this.intentoEdicion.set(true);
    if (this.edicion.invalid) {
      this.edicion.markAllAsTouched();
      return;
    }
    const cambios: NuevoPeriodo = this.edicion.getRawValue();
    this.ejecutar(
      this.disponibilidad.actualizarPeriodo(periodo.idAlojamiento, periodo.idPeriodo, cambios),
      periodo.idPeriodo,
      'Actualizamos el periodo.',
      'No pudimos actualizar el periodo.',
      (actualizado) => {
        this.reemplazar(actualizado);
        this.editando.set(null);
      },
    );
  }

  pedirConfirmacion(periodo: PeriodoDisponible): void {
    this.editando.set(null);
    this.limpiarMensajes();
    this.confirmando.set(periodo.idPeriodo);
  }

  deshabilitar(periodo: PeriodoDisponible): void {
    this.ejecutar(
      this.disponibilidad.deshabilitarPeriodo(periodo.idAlojamiento, periodo.idPeriodo),
      periodo.idPeriodo,
      'Deshabilitamos el periodo. Ya no se podrá reservar en esas fechas.',
      'No pudimos deshabilitar el periodo.',
      (actualizado) => {
        this.reemplazar(actualizado);
        this.confirmando.set(null);
      },
    );
  }

  invalidoNuevo(campo: 'fechaInicio' | 'fechaFin'): boolean {
    const control = this.nuevo.controls[campo];
    return control.invalid && (control.touched || this.intentoNuevo());
  }

  private ejecutar(
    peticion: Observable<PeriodoDisponible>,
    lugar: string,
    exito: string,
    falla: string,
    alTerminar: (periodo: PeriodoDisponible) => void,
  ): void {
    if (this.procesando()) {
      return;
    }
    this.limpiarMensajes();
    this.lugarMensaje.set(lugar);
    this.procesando.set(true);
    peticion
      .pipe(
        finalize(() => this.procesando.set(false)),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe({
        next: (periodo) => {
          alTerminar(periodo);
          this.actualizacion.update((valor) => valor + 1);
          this.aviso.set(exito);
        },
        error: (error: unknown) => this.error.set(mensajeDeError(error, falla)),
      });
  }

  private reemplazar(actualizado: PeriodoDisponible): void {
    this.periodos.update((lista) =>
      (lista ?? []).map((periodo) =>
        periodo.idPeriodo === actualizado.idPeriodo ? actualizado : periodo,
      ),
    );
  }

  private limpiarMensajes(): void {
    this.aviso.set(null);
    this.error.set(null);
  }
}
