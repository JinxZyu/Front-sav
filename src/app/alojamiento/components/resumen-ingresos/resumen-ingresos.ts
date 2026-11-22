import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { IngresosAnfitrionService } from '../../services/ingresos-anfitrion.service';
import { formatearPesos, formatearPesosCortos } from '../../utils/formato';

/**
 * Lo que ha generado el anfitrión: lo que se queda después de la comisión de la plataforma y de las devoluciones por
 * cancelaciones, y el desglose por alojamiento.
 */
@Component({
  selector: 'app-resumen-ingresos',
  templateUrl: './resumen-ingresos.html',
  styleUrl: './resumen-ingresos.css',
})
export class ResumenIngresos {
  private readonly servicio = inject(IngresosAnfitrionService);

  /** Se oculta cuando la página que lo usa ya tiene su propio título. */
  readonly mostrarTitulo = input(true);
  /** Muestra el desglose por alojamiento desplegado desde el inicio. */
  readonly desgloseAbierto = input(false);

  protected readonly consulta = rxResource({ stream: () => this.servicio.consultar() });

  protected readonly datos = computed(() => (this.consulta.hasValue() ? this.consulta.value() : null));
  protected readonly falla = computed(() => this.consulta.status() === 'error');
  protected readonly pesos = formatearPesos;
  protected readonly pesosCortos = (valor: number) => formatearPesosCortos(valor, 14);

  protected reintentar(): void {
    this.consulta.reload();
  }
}
