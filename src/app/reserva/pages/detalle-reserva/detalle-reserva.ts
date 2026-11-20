import { Component, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { formatearFechaHora } from '../../../alojamiento/utils/formato';
import { EncabezadoReserva } from '../../components/encabezado-reserva/encabezado-reserva';
import { ResumenReserva } from '../../components/resumen-reserva/resumen-reserva';
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

  protected readonly consulta = rxResource({
    params: () => this.idReserva() || undefined,
    stream: ({ params }) => this.servicio.miReserva(params),
  });

  private readonly estado = estadoDeConsulta(this.consulta);
  protected readonly reserva = this.estado.valor;
  protected readonly noEncontrada = this.estado.noEncontrada;
  protected readonly error = this.estado.error;

  protected readonly fechaHora = formatearFechaHora;
}
