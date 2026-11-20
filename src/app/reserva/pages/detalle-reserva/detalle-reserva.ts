import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription, finalize, map } from 'rxjs';
import { formatearPorcentaje } from '../../../alojamiento/models/alojamiento.models';
import { formatearFechaHora, formatearPesos } from '../../../alojamiento/utils/formato';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { EncabezadoReserva } from '../../components/encabezado-reserva/encabezado-reserva';
import { ResumenReserva } from '../../components/resumen-reserva/resumen-reserva';
import {
  AvisoReserva,
  CancelacionReserva,
  PagoReserva,
  cancelable,
  retencionVigente,
} from '../../models/reserva.models';
import { ReservaService } from '../../services/reserva.service';
import { estadoDeConsulta } from '../../utils/consulta-reserva';

@Component({
  selector: 'app-detalle-reserva',
  imports: [ReactiveFormsModule, EncabezadoReserva, ResumenReserva],
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

  private readonly avisoNueva = this.ruta.snapshot.queryParamMap.get('aviso') === 'nueva';
  private operacion: Subscription | null = null;

  private readonly nueva = linkedSignal<string, boolean>({
    source: this.idReserva,
    computation: (_id, previo) => !previo && this.avisoNueva,
  });

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

  protected readonly puedeCancelar = computed(() => {
    const reserva = this.reserva();
    return !!reserva && cancelable(reserva.estado);
  });

  private readonly resultado = linkedSignal<string, AvisoReserva | null>({
    source: this.idReserva,
    computation: () => null,
  });

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
  private readonly operando = linkedSignal({ source: this.idReserva, computation: () => false });
  protected readonly procesando = computed(() => this.operando() || this.consulta.isLoading());
  protected readonly pagoEnProceso = linkedSignal({
    source: this.idReserva,
    computation: () => false,
  });
  protected readonly cancelando = linkedSignal({
    source: this.idReserva,
    computation: () => false,
  });
  protected readonly devolucion = linkedSignal<string, CancelacionReserva | null>({
    source: this.idReserva,
    computation: () => null,
  });

  protected readonly formularioCancelacion = new FormGroup({
    motivo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(1000)],
    }),
  });

  protected readonly motivo = this.formularioCancelacion.controls.motivo;

  protected readonly pesos = formatearPesos;
  protected readonly fechaHora = formatearFechaHora;
  protected readonly porcentaje = formatearPorcentaje;

  constructor() {
    const reloj = setInterval(() => this.ahora.set(Date.now()), 15_000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(reloj);
      this.operacion?.unsubscribe();
    });
    effect(() => {
      this.idReserva();
      untracked(() => {
        this.operacion?.unsubscribe();
        this.formularioCancelacion.reset();
      });
    });
  }

  protected pagar(): void {
    if (this.procesando() || !this.apartada()) {
      return;
    }
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

  protected abrirCancelacion(): void {
    this.cancelando.set(true);
    this.nueva.set(false);
    this.resultado.set(null);
  }

  protected cerrarCancelacion(): void {
    this.cancelando.set(false);
    this.motivo.reset();
  }

  protected cancelar(): void {
    if (this.motivo.invalid || !this.motivo.value.trim()) {
      this.motivo.setErrors({ required: true });
      this.motivo.markAsTouched();
      return;
    }
    this.ejecutar(
      this.servicio.cancelar(this.idReserva(), this.motivo.value.trim()),
      (resultado) => {
        this.cerrarCancelacion();
        this.devolucion.set(resultado);
        this.resultado.set({ tono: 'info', texto: resultado.mensaje });
      },
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
    const idReserva = this.idReserva();
    this.operacion?.unsubscribe();
    this.operando.set(true);
    this.nueva.set(false);
    this.resultado.set(null);
    this.operacion = operacion
      .pipe(
        finalize(() => {
          if (this.idReserva() === idReserva) {
            this.operando.set(false);
            this.consulta.reload();
          }
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
