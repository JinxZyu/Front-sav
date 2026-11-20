import { Component, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ConsultaDisponibilidad } from '../../../disponibilidad/models/disponibilidad.models';
import { DisponibilidadService } from '../../../disponibilidad/services/disponibilidad.service';
import { comoDia, comoFecha, hoy, moverDias } from '../../../disponibilidad/utils/fechas';

export interface FechasElegidas {
  llegada: string;
  salida: string;
}

type EstadoDia = 'libre' | 'no-disponible' | 'pasado';

interface DiaSelector {
  dia: string;
  numero: number;
  estado: EstadoDia;
  elegible: boolean;
  etiqueta: string;
}

const DIAS_CONSULTADOS = 366;
const NOMBRE_MES = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
const NOMBRE_DIA = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

@Component({
  selector: 'app-selector-fechas',
  templateUrl: './selector-fechas.html',
  styleUrl: './selector-fechas.css',
})
export class SelectorFechas {
  private readonly servicio = inject(DisponibilidadService);

  readonly idAlojamiento = input.required<string>();
  readonly llegada = input('');
  readonly salida = input('');
  readonly elegir = output<FechasElegidas>();

  protected readonly diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  private readonly hoy = hoy();
  private readonly limite = moverDias(this.hoy, DIAS_CONSULTADOS);

  protected readonly consulta = rxResource({
    params: () => this.idAlojamiento(),
    stream: ({ params }) => this.servicio.consultar(params, this.hoy, this.limite),
  });

  private readonly nocheLibre = computed(() => {
    const datos = this.consulta.hasValue() ? this.consulta.value() : null;
    return datos ? criterioDeNoches(datos, this.hoy, this.limite) : null;
  });

  protected readonly mes = signal(primerDiaDelMes(comoFecha(this.hoy) ?? new Date()));
  protected readonly tituloMes = computed(() => capitalizar(NOMBRE_MES.format(this.mes())));
  protected readonly esPrimerMes = computed(
    () => comoDia(this.mes()) <= comoDia(primerDiaDelMes(comoFecha(this.hoy) ?? new Date())),
  );
  protected readonly esUltimoMes = computed(() => {
    const siguiente = new Date(this.mes().getFullYear(), this.mes().getMonth() + 1, 1);
    return comoDia(siguiente) > this.limite;
  });

  private readonly eligiendoSalida = computed(() => !!this.llegada() && !this.salida());

  protected readonly semanas = computed<(DiaSelector | null)[][]>(() => {
    const libre = this.nocheLibre();
    if (!libre) {
      return [];
    }
    const inicio = this.mes();
    const celdas: (DiaSelector | null)[] = Array.from(
      { length: (inicio.getDay() + 6) % 7 },
      () => null,
    );
    const total = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate();
    for (let numero = 1; numero <= total; numero++) {
      const fecha = new Date(inicio.getFullYear(), inicio.getMonth(), numero);
      const dia = comoDia(fecha);
      let estado: EstadoDia = 'libre';
      if (dia < this.hoy) {
        estado = 'pasado';
      } else if (!libre(dia)) {
        estado = 'no-disponible';
      }
      const elegible = this.esElegible(dia, libre);
      celdas.push({
        dia,
        numero,
        estado,
        elegible,
        etiqueta: `${NOMBRE_DIA.format(fecha)}${estado === 'libre' ? '' : ', no disponible'}`,
      });
    }
    while (celdas.length % 7 !== 0) {
      celdas.push(null);
    }
    const semanas: (DiaSelector | null)[][] = [];
    for (let indice = 0; indice < celdas.length; indice += 7) {
      semanas.push(celdas.slice(indice, indice + 7));
    }
    return semanas;
  });

  protected readonly ayuda = computed(() =>
    this.eligiendoSalida() ? 'Ahora elige el día de salida.' : 'Elige el día de llegada.',
  );

  protected readonly error = computed(() =>
    this.consulta.status() === 'error'
      ? 'No pudimos consultar la disponibilidad. Puedes escribir las fechas arriba.'
      : null,
  );

  protected clase(celda: DiaSelector): Record<string, boolean> {
    const llegada = this.llegada();
    const salida = this.salida();
    return {
      [celda.estado]: true,
      extremo: celda.dia === llegada || celda.dia === salida,
      rango: !!llegada && !!salida && celda.dia > llegada && celda.dia < salida,
    };
  }

  protected tocar(celda: DiaSelector): void {
    const libre = this.nocheLibre();
    if (!libre || !celda.elegible) {
      return;
    }
    const llegada = this.llegada();
    if (this.eligiendoSalida() && celda.dia > llegada && nochesLibres(llegada, celda.dia, libre)) {
      this.elegir.emit({ llegada, salida: celda.dia });
      return;
    }
    this.elegir.emit({ llegada: celda.dia, salida: '' });
  }

  protected moverMes(cantidad: number): void {
    const actual = this.mes();
    this.mes.set(new Date(actual.getFullYear(), actual.getMonth() + cantidad, 1));
  }

  private esElegible(dia: string, libre: (dia: string) => boolean): boolean {
    if (dia < this.hoy) {
      return false;
    }
    const llegada = this.llegada();
    if (this.eligiendoSalida() && dia > llegada) {
      return nochesLibres(llegada, dia, libre) || libre(dia);
    }
    return libre(dia);
  }
}

export function criterioDeNoches(
  datos: ConsultaDisponibilidad,
  desde: string,
  hasta: string,
): (dia: string) => boolean {
  const ocupadas = new Set(datos.nochesOcupadas);
  const periodos = datos.periodosDisponibles;
  return (dia) =>
    dia >= desde &&
    dia < hasta &&
    !ocupadas.has(dia) &&
    (!periodos || periodos.some((periodo) => periodo.fechaInicio <= dia && dia < periodo.fechaFin));
}

export function nochesLibres(
  llegada: string,
  salida: string,
  libre: (dia: string) => boolean,
): boolean {
  for (let dia = llegada; dia < salida; dia = moverDias(dia, 1)) {
    if (!libre(dia)) {
      return false;
    }
  }
  return true;
}

function primerDiaDelMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
