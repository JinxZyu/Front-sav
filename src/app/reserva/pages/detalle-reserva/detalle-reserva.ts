import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { formatearFechaHora } from '../../../alojamiento/utils/formato';
import { EncabezadoReserva } from '../../components/encabezado-reserva/encabezado-reserva';
import { ResumenReserva } from '../../components/resumen-reserva/resumen-reserva';
import { AvisoReserva } from '../../models/reserva.models';
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

  protected readonly fechaHora = formatearFechaHora;
}
