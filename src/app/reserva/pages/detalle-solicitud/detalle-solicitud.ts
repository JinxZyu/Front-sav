import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { finalize, map } from 'rxjs';
import { formatearFechaHora } from '../../../alojamiento/utils/formato';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { EncabezadoReserva } from '../../components/encabezado-reserva/encabezado-reserva';
import { ResumenReserva } from '../../components/resumen-reserva/resumen-reserva';
import { AvisoReserva } from '../../models/reserva.models';
import { ReservaService } from '../../services/reserva.service';
import { estadoDeConsulta } from '../../utils/consulta-reserva';

const EXPLICACIONES: Record<string, string> = {
  PENDIENTE_APROBACION:
    'Este huésped espera tu respuesta. Si la apruebas tendrá un plazo para pagar; si no respondes a tiempo se rechaza sola.',
  PENDIENTE_PAGO: 'Aprobaste la solicitud. Estamos esperando el pago del huésped.',
  CONFIRMADA: 'La reserva está pagada y confirmada.',
  RECHAZADA: 'La solicitud fue rechazada y las fechas quedaron libres.',
  EXPIRADA: 'El huésped no pagó a tiempo y las fechas quedaron libres.',
  CANCELADA: 'El huésped canceló esta reserva.',
};

@Component({
  selector: 'app-detalle-solicitud',
  imports: [EncabezadoReserva, ResumenReserva],
  templateUrl: './detalle-solicitud.html',
  styleUrls: ['../../styles/pagina-reserva.css', './detalle-solicitud.css'],
})
export class DetalleSolicitud {
  private readonly servicio = inject(ReservaService);

  private readonly idReserva = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((parametros) => parametros.get('idReserva') ?? '')),
    { initialValue: '' },
  );

  protected readonly consulta = rxResource({
    params: () => this.idReserva() || undefined,
    stream: ({ params }) => this.servicio.reservaDeMiAlojamiento(params),
  });

  private readonly estado = estadoDeConsulta(this.consulta);
  protected readonly reserva = this.estado.valor;
  protected readonly noEncontrada = this.estado.noEncontrada;
  protected readonly error = this.estado.error;

  protected readonly filas = computed(() => {
    const reserva = this.reserva();
    if (!reserva) {
      return [];
    }
    const filas = [{ etiqueta: 'Huésped', valor: reserva.huesped }];
    if (reserva.estado === 'PENDIENTE_APROBACION' && reserva.retencionHasta) {
      filas.push({
        etiqueta: 'Responde antes del',
        valor: formatearFechaHora(reserva.retencionHasta),
      });
    }
    return filas;
  });

  protected readonly explicacion = computed(() => {
    const estado = this.reserva()?.estado;
    return estado ? (EXPLICACIONES[estado] ?? null) : null;
  });

  protected readonly aviso = signal<AvisoReserva | null>(null);
  protected readonly decidiendo = signal(false);
  protected readonly confirmandoRechazo = signal(false);

  protected decidir(aprobar: boolean): void {
    this.decidiendo.set(true);
    this.aviso.set(null);
    this.servicio
      .decidir(this.idReserva(), aprobar)
      .pipe(
        finalize(() => {
          this.decidiendo.set(false);
          this.confirmandoRechazo.set(false);
          this.consulta.reload();
        }),
      )
      .subscribe({
        next: (decision) =>
          this.aviso.set({ tono: aprobar ? 'exito' : 'info', texto: decision.mensaje }),
        error: (error: unknown) =>
          this.aviso.set({
            tono: 'error',
            texto: mensajeDeError(error, 'No pudimos registrar tu decisión.'),
          }),
      });
  }
}
