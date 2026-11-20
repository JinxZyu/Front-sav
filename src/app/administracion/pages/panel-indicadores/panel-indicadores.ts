import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { formatearFechaHora, formatearPesos } from '../../../alojamiento/utils/formato';
import { estadoReserva } from '../../../reserva/models/reserva.models';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { BarrasIndicador } from '../../components/barras-indicador/barras-indicador';
import { BarraIndicador, ORDEN_ESTADOS_RESERVA } from '../../models/indicadores.models';
import { IndicadoresService } from '../../services/indicadores.service';

const NUMERO = new Intl.NumberFormat('es-CO');

@Component({
  selector: 'app-panel-indicadores',
  imports: [BarrasIndicador],
  templateUrl: './panel-indicadores.html',
  styleUrls: ['../../styles/pagina-administracion.css', './panel-indicadores.css'],
})
export class PanelIndicadores {
  private readonly servicio = inject(IndicadoresService);

  protected readonly consulta = rxResource({ stream: () => this.servicio.consultar() });

  protected readonly datos = computed(() =>
    this.consulta.hasValue() ? this.consulta.value() : null,
  );

  protected readonly reservas = computed<BarraIndicador[]>(() => {
    const porEstado = this.datos()?.reservasPorEstado ?? {};
    const otros = Object.keys(porEstado).filter(
      (estado) => !ORDEN_ESTADOS_RESERVA.includes(estado),
    );
    return [...ORDEN_ESTADOS_RESERVA, ...otros].map((estado) => ({
      etiqueta: estadoReserva(estado).etiqueta,
      valor: porEstado[estado] ?? 0,
    }));
  });

  protected readonly totalReservas = computed(() =>
    this.reservas().reduce((suma, barra) => suma + barra.valor, 0),
  );

  protected readonly ciudades = computed<BarraIndicador[]>(() =>
    (this.datos()?.ciudadesConMayorDemanda ?? []).map((ciudad) => ({
      etiqueta: ciudad.ciudad,
      valor: ciudad.solicitudesCotizacion,
    })),
  );

  protected readonly error = computed(() =>
    this.consulta.status() === 'error'
      ? mensajeDeError(this.consulta.error(), 'No pudimos consultar los indicadores.')
      : null,
  );

  protected readonly pesos = formatearPesos;
  protected readonly fecha = formatearFechaHora;

  protected numero(valor: number): string {
    return NUMERO.format(valor);
  }

  protected contar(valor: number, singular: string, plural: string): string {
    return `${NUMERO.format(valor)} ${valor === 1 ? singular : plural}`;
  }
}
