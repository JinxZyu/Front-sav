import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { DisponibilidadService } from '../../services/disponibilidad.service';
import { comoDia, hoy } from '../../utils/fechas';

export type EstadoDia = 'disponible' | 'ocupada' | 'sin-periodo' | 'pasada';

export interface DiaCalendario {
  dia: string;
  numero: number;
  estado: EstadoDia;
  etiqueta: string;
}

const NOMBRE_MES = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
const NOMBRE_DIA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long' });
const ETIQUETAS: Record<EstadoDia, string> = {
  disponible: 'disponible',
  ocupada: 'ocupada por una reserva',
  'sin-periodo': 'sin periodo disponible',
  pasada: 'fecha pasada',
};

@Component({
  selector: 'app-calendario-disponibilidad',
  templateUrl: './calendario-disponibilidad.html',
  styleUrl: './calendario-disponibilidad.css',
})
export class CalendarioDisponibilidad {
  private readonly servicio = inject(DisponibilidadService);

  readonly idAlojamiento = input.required<string>();
  readonly actualizacion = input(0);

  readonly diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  readonly calendario = rxResource({
    params: () => ({ id: this.idAlojamiento(), version: this.actualizacion() }),
    stream: ({ params }) => this.servicio.calendario(params.id),
  });

  readonly mes = signal(primerDiaDelMes(new Date()));
  readonly tituloMes = computed(() => capitalizar(NOMBRE_MES.format(this.mes())));
  readonly esMesActual = computed(
    () => this.mes().getTime() === primerDiaDelMes(new Date()).getTime(),
  );

  readonly error = computed(() =>
    this.calendario.status() === 'error'
      ? mensajeDeError(this.calendario.error(), 'No pudimos consultar el calendario.')
      : null,
  );

  readonly semanas = computed<(DiaCalendario | null)[][]>(() => {
    const datos = this.calendario.hasValue() ? this.calendario.value() : null;
    const ocupadas = new Set(datos?.nochesOcupadas ?? []);
    const habilitados = (datos?.periodos ?? []).filter((periodo) => periodo.habilitado);
    const inicio = this.mes();
    const hoyTexto = hoy();
    const celdas: (DiaCalendario | null)[] = Array.from(
      { length: (inicio.getDay() + 6) % 7 },
      () => null,
    );
    const total = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate();
    for (let numero = 1; numero <= total; numero++) {
      const fecha = new Date(inicio.getFullYear(), inicio.getMonth(), numero);
      const dia = comoDia(fecha);
      let estado: EstadoDia = 'sin-periodo';
      if (ocupadas.has(dia)) {
        estado = 'ocupada';
      } else if (dia < hoyTexto) {
        estado = 'pasada';
      } else if (habilitados.some((p) => p.fechaInicio <= dia && dia < p.fechaFin)) {
        estado = 'disponible';
      }
      celdas.push({
        dia,
        numero,
        estado,
        etiqueta: `${NOMBRE_DIA.format(fecha)}: ${ETIQUETAS[estado]}`,
      });
    }
    while (celdas.length % 7 !== 0) {
      celdas.push(null);
    }
    const semanas: (DiaCalendario | null)[][] = [];
    for (let indice = 0; indice < celdas.length; indice += 7) {
      semanas.push(celdas.slice(indice, indice + 7));
    }
    return semanas;
  });

  moverMes(cantidad: number): void {
    const actual = this.mes();
    this.mes.set(new Date(actual.getFullYear(), actual.getMonth() + cantidad, 1));
  }
}

function primerDiaDelMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
