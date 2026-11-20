import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Observable, finalize, map } from 'rxjs';
import { formatearFechaHora, formatearPesos } from '../../../alojamiento/utils/formato';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { EncabezadoReserva } from '../../components/encabezado-reserva/encabezado-reserva';
import { ResumenReserva } from '../../components/resumen-reserva/resumen-reserva';
import { AvisoReserva, PagoReserva, retencionVigente } from '../../models/reserva.models';
import { ReservaService } from '../../services/reserva.service';
import { estadoDeConsulta } from '../../utils/consulta-reserva';

@Component({
  selector: 'app-detalle-reserva',
  imports: [EncabezadoReserva, ResumenReserva],
  templateUrl: './detalle-reserva.html',
  styleUrls: ['../../styles/pagina-reserva.css', './detalle-reserva.css'],
})
export class DetalleReserva {
  private readonly servicio = inject(ReservaService);
  private readonly ruta = inject(ActivatedRoute);

  private readonly idReserva = toSignal(
    this.ruta.paramMap.pipe(map((parametros) => parametros.get('idReserva') ?? '')),
    { initialValue: '' },
  );

  private readonly nueva = signal(this.ruta.snapshot.queryParamMap.get('aviso') === 'nueva');

  protected readonly consulta = rxResource({
    params: () => this.idReserva() || undefined,
    stream: ({ params }) => this.servicio.miReserva(params),
  });

  private readonly estado = estadoDeConsulta(this.consulta);
  protected readonly reserva = this.estado.valor;
  protected readonly noEncontrada = this.estado.noEncontrada;
  protected readonly error = this.estado.error;

  private readonly ahora = signal(Date.now());

  private readonly pendienteDePago = computed(() => {
    const reserva = this.reserva();
    return reserva?.estado === 'PENDIENTE_PAGO' ? reserva : null;
  });

  protected readonly apartada = computed(() => {
    const reserva = this.pendienteDePago();
    return !!reserva && retencionVigente(reserva.retencionHasta, this.ahora());
  });

  protected readonly puedeApartar = computed(() => !!this.pendienteDePago() && !this.apartada());

  protected readonly minutosRestantes = computed(() => {
    const limite = this.pendienteDePago()?.retencionHasta;
    const restante = limite ? new Date(limite).getTime() - this.ahora() : 0;
    return Math.max(1, Math.ceil(restante / 60_000));
  });

  private readonly resultado = signal<AvisoReserva | null>(null);

  protected readonly aviso = computed<AvisoReserva | null>(() => {
    const resultado = this.resultado();
    const reserva = this.reserva();
    if (resultado || !this.nueva() || !reserva) {
      return resultado;
    }
    return reserva.estado === 'PENDIENTE_APROBACION'
      ? { tono: 'exito', texto: 'Enviamos tu solicitud al anfitrión.' }
      : { tono: 'exito', texto: 'Creamos tu reserva.' };
  });
  protected readonly procesando = signal(false);
  protected readonly pagoEnProceso = signal(false);

  protected readonly pesos = formatearPesos;
  protected readonly fechaHora = formatearFechaHora;

  constructor() {
    const reloj = setInterval(() => this.ahora.set(Date.now()), 15_000);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  protected pagar(): void {
    this.ejecutar(this.servicio.pagar(this.idReserva()), (pago) => this.alPagar(pago));
  }

  protected apartar(): void {
    this.ejecutar(this.servicio.retener(this.idReserva()), () =>
      this.resultado.set({
        tono: 'info',
        texto: 'Apartamos de nuevo tus fechas. Ya puedes pagar.',
      }),
    );
  }

  private alPagar(pago: PagoReserva): void {
    this.pagoEnProceso.set(pago.estadoPago === 'PENDIENTE');
    if (pago.estadoReserva === 'CONFIRMADA') {
      this.resultado.set({ tono: 'exito', texto: '¡Pago aprobado! Tu reserva está confirmada.' });
    } else if (pago.estadoPago === 'FALLIDO') {
      this.resultado.set({
        tono: 'error',
        texto:
          'El pago fue rechazado. Puedes intentarlo de nuevo mientras tus fechas sigan apartadas.',
      });
    } else {
      this.resultado.set({
        tono: 'info',
        texto: 'Estamos confirmando tu pago. Consulta de nuevo en unos segundos.',
      });
    }
  }

  private ejecutar<T>(operacion: Observable<T>, alTerminar: (respuesta: T) => void): void {
    this.procesando.set(true);
    this.nueva.set(false);
    this.resultado.set(null);
    operacion
      .pipe(
        finalize(() => {
          this.procesando.set(false);
          this.consulta.reload();
        }),
      )
      .subscribe({
        next: alTerminar,
        error: (error: unknown) =>
          this.resultado.set({
            tono: 'error',
            texto: mensajeDeError(error, 'No pudimos completar la operación.'),
          }),
      });
  }
}
