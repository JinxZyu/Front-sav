import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { formatearFechaHora } from '../../../alojamiento/utils/formato';
import { AvisosService } from '../../../shared/services/avisos.service';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { ConfiguracionTarifa } from '../../models/tarifa.models';
import { TarifasService } from '../../services/tarifas.service';

const PATRON_PORCENTAJE = /^\d{1,3}([.,]\d{1,2})?$/;
const VALIDADORES = [Validators.required, Validators.pattern(PATRON_PORCENTAJE)];

type Campo = 'porcentajeServicio' | 'porcentajeDescuento';

@Component({
  selector: 'app-configuracion-tarifas',
  imports: [ReactiveFormsModule],
  templateUrl: './configuracion-tarifas.html',
  styleUrls: ['../../styles/pagina-administracion.css', './configuracion-tarifas.css'],
})
export class ConfiguracionTarifas {
  private readonly servicio = inject(TarifasService);
  private readonly avisos = inject(AvisosService);

  protected readonly consulta = rxResource({ stream: () => this.servicio.vigente() });

  protected readonly vigente = computed(() =>
    this.consulta.hasValue() ? this.consulta.value() : null,
  );

  protected readonly sinConfiguracion = computed(() => {
    const error = this.consulta.status() === 'error' ? this.consulta.error() : null;
    return error instanceof HttpErrorResponse && error.status === 404;
  });

  protected readonly errorCarga = computed(() =>
    this.consulta.status() === 'error' && !this.sinConfiguracion()
      ? mensajeDeError(this.consulta.error(), 'No pudimos consultar las tarifas vigentes.')
      : null,
  );

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    porcentajeServicio: ['', VALIDADORES],
    porcentajeDescuento: ['', VALIDADORES],
  });

  protected readonly fecha = formatearFechaHora;

  constructor() {
    effect(() => {
      const vigente = this.vigente();
      if (vigente) {
        untracked(() => this.cargar(vigente));
      }
    });
  }

  protected porcentaje(valor: number): string {
    return `${Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`;
  }

  protected invalido(campo: Campo): boolean {
    const control = this.formulario.controls[campo];
    return control.touched && (control.invalid || this.numero(control.value) > 100);
  }

  protected guardar(): void {
    if (this.enviando()) {
      return;
    }
    this.formulario.markAllAsTouched();
    if (this.invalido('porcentajeServicio') || this.invalido('porcentajeDescuento')) {
      return;
    }
    const { porcentajeServicio, porcentajeDescuento } = this.formulario.getRawValue();
    this.enviando.set(true);
    this.error.set(null);
    this.servicio
      .configurar({
        porcentajeServicio: this.numero(porcentajeServicio),
        porcentajeDescuento: this.numero(porcentajeDescuento),
      })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          this.formulario.markAsPristine();
          this.avisos.mostrar(
            'Tarifas actualizadas',
            'Las nuevas cotizaciones ya usan estos porcentajes.',
          );
          this.consulta.reload();
        },
        error: (error: unknown) =>
          this.error.set(mensajeDeError(error, 'No pudimos guardar las tarifas.')),
      });
  }

  private cargar(vigente: ConfiguracionTarifa): void {
    if (this.formulario.dirty) {
      return;
    }
    this.formulario.reset({
      porcentajeServicio: String(Number(vigente.porcentajeServicio)),
      porcentajeDescuento: String(Number(vigente.porcentajeDescuento)),
    });
  }

  private numero(valor: string): number {
    return Number(valor.replace(',', '.'));
  }
}
