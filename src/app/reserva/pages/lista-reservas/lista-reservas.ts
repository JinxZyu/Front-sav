import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, map } from 'rxjs';
import { formatearFechaHora } from '../../../alojamiento/utils/formato';
import { hoy } from '../../../disponibilidad/utils/fechas';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { TarjetaReserva } from '../../components/tarjeta-reserva/tarjeta-reserva';
import { ReservaDeAlojamiento, ReservaPropia } from '../../models/reserva.models';
import { ReservaService } from '../../services/reserva.service';

const EN_PROCESO = ['PENDIENTE_APROBACION', 'PENDIENTE_PAGO'];
const REVISAR_FECHA_CADA = 60_000;

const contar = (cantidad: number, singular: string, plural: string) =>
  `${cantidad} ${cantidad === 1 ? singular : plural}`;

interface FilaReserva {
  idReserva: string;
  titulo: string;
  detalle: string | null;
  fechaEntrada: string;
  fechaSalida: string;
  estado: string;
  monto: number;
}

@Component({
  selector: 'app-lista-reservas',
  imports: [RouterLink, TarjetaReserva],
  templateUrl: './lista-reservas.html',
  styleUrl: './lista-reservas.css',
})
export class ListaReservas {
  private readonly servicio = inject(ReservaService);

  protected readonly anfitrion = inject(ActivatedRoute).snapshot.data['vista'] === 'anfitrion';
  protected readonly soloPendientes = signal(false);
  private readonly fechaHoy = signal(hoy());

  constructor() {
    const reloj = setInterval(() => this.fechaHoy.set(hoy()), REVISAR_FECHA_CADA);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  protected readonly consulta = rxResource({
    stream: () => (this.anfitrion ? this.deMisAlojamientos() : this.propias()),
  });

  protected readonly todas = computed(() =>
    this.consulta.hasValue() ? this.consulta.value() : null,
  );

  protected readonly pendientes = computed(
    () => this.todas()?.filter((reserva) => reserva.estado === 'PENDIENTE_APROBACION').length ?? 0,
  );

  protected readonly resumen = computed(() => {
    const todas = this.todas();
    if (this.anfitrion) {
      const pendientes = this.pendientes();
      return pendientes > 0
        ? `Tienes ${contar(pendientes, 'solicitud', 'solicitudes')} por responder.`
        : 'Aquí verás las reservas de tus alojamientos.';
    }
    const fechaHoy = this.fechaHoy();
    const proximos =
      todas?.filter(
        (reserva) => reserva.estado === 'CONFIRMADA' && reserva.fechaEntrada >= fechaHoy,
      ).length ?? 0;
    const enProceso = todas?.filter((reserva) => EN_PROCESO.includes(reserva.estado)).length ?? 0;
    const partes = [
      proximos > 0 ? contar(proximos, 'viaje próximo', 'viajes próximos') : '',
      enProceso > 0 ? contar(enProceso, 'solicitud en proceso', 'solicitudes en proceso') : '',
    ].filter(Boolean);
    return partes.length > 0 ? `Tienes ${partes.join(' y ')}.` : 'Aquí verás todos tus viajes.';
  });

  protected readonly reservas = computed(() => {
    const todas = this.todas();
    return todas && this.soloPendientes()
      ? todas.filter((reserva) => reserva.estado === 'PENDIENTE_APROBACION')
      : todas;
  });

  protected readonly error = computed(() =>
    this.consulta.status() === 'error'
      ? mensajeDeError(this.consulta.error(), 'No pudimos consultar las reservas.')
      : null,
  );

  protected enlace(idReserva: string): string[] {
    return this.anfitrion ? ['/reservas/alojamientos', idReserva] : ['/reservas', idReserva];
  }

  private propias(): Observable<FilaReserva[]> {
    return this.servicio
      .misReservas()
      .pipe(map(({ reservas }) => reservas.map((reserva) => comoFila(reserva, null))));
  }

  private deMisAlojamientos(): Observable<FilaReserva[]> {
    return this.servicio
      .reservasDeMisAlojamientos()
      .pipe(
        map(({ reservas }) =>
          reservas.map((reserva) => comoFila(reserva, detalleParaAnfitrion(reserva))),
        ),
      );
  }
}

function comoFila(
  reserva: Omit<ReservaPropia, 'idAlojamiento' | 'fechaSolicitud' | 'retencionHasta' | 'resenada'>,
  detalle: string | null,
): FilaReserva {
  return {
    idReserva: reserva.idReserva,
    titulo: reserva.alojamiento,
    detalle,
    fechaEntrada: reserva.fechaEntrada,
    fechaSalida: reserva.fechaSalida,
    estado: reserva.estado,
    monto: reserva.montoTotal,
  };
}

function detalleParaAnfitrion(reserva: ReservaDeAlojamiento): string {
  const huesped = `Huésped: ${reserva.huesped}`;
  return reserva.estado === 'PENDIENTE_APROBACION' && reserva.retencionHasta
    ? `${huesped} · Responde antes del ${formatearFechaHora(reserva.retencionHasta)}`
    : huesped;
}
