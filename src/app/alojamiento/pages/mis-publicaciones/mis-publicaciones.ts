import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { TarjetaPublicacion } from '../../components/tarjeta-publicacion/tarjeta-publicacion';
import { PublicacionAlojamientoService } from '../../services/publicacion-alojamiento.service';
import { formatearFecha } from '../../utils/formato';

export interface FiltroEstado {
  /** Estados de publicación que agrupa; vacío significa todos. */
  estados: string[];
  clave: string;
  etiqueta: string;
}

export const FILTROS_ESTADO: FiltroEstado[] = [
  { clave: 'todas', etiqueta: 'Todas', estados: [] },
  { clave: 'publicadas', etiqueta: 'Publicadas', estados: ['ACTIVA'] },
  { clave: 'revision', etiqueta: 'En revisión', estados: ['PENDIENTE_REVISION'] },
  { clave: 'pausadas', etiqueta: 'Pausadas', estados: ['PAUSADA'] },
  { clave: 'borrador', etiqueta: 'Borrador', estados: ['BORRADOR'] },
];

/** Minúsculas y sin tildes, para que "cabana" encuentre "Cabaña". */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

@Component({
  selector: 'app-mis-publicaciones',
  imports: [RouterLink, TarjetaPublicacion],
  templateUrl: './mis-publicaciones.html',
  styleUrl: './mis-publicaciones.css',
})
export class MisPublicaciones {
  private readonly servicio = inject(PublicacionAlojamientoService);

  protected readonly consulta = rxResource({
    stream: () => this.servicio.misPublicaciones(),
  });

  protected readonly publicaciones = computed(() =>
    this.consulta.hasValue() ? (this.consulta.value().publicaciones ?? []) : [],
  );

  protected readonly busqueda = signal('');
  protected readonly filtro = signal('todas');

  protected readonly filtros = computed(() =>
    FILTROS_ESTADO.map((opcion) => ({
      ...opcion,
      cantidad: this.publicaciones().filter((publicacion) =>
        coincideConEstado(publicacion.estado, opcion),
      ).length,
    })),
  );

  /** Publicaciones que quedan después de aplicar el filtro de estado y la búsqueda. */
  protected readonly visibles = computed(() => {
    const opcion = FILTROS_ESTADO.find((actual) => actual.clave === this.filtro());
    const texto = normalizarTexto(this.busqueda());
    return this.publicaciones().filter(
      (publicacion) =>
        (!opcion || coincideConEstado(publicacion.estado, opcion)) &&
        (!texto ||
          normalizarTexto(
            `${publicacion.titulo} ${publicacion.ciudad} ${publicacion.tipoAlojamiento}`,
          ).includes(texto)),
    );
  });

  protected readonly hayFiltros = computed(
    () => this.filtro() !== 'todas' || this.busqueda().trim() !== '',
  );

  protected readonly error = computed(() =>
    this.consulta.status() === 'error'
      ? mensajeDeError(this.consulta.error(), 'No pudimos consultar tus publicaciones.')
      : null,
  );

  protected readonly cargando = computed(
    () => this.consulta.isLoading() && !this.consulta.hasValue(),
  );

  protected readonly fecha = formatearFecha;

  protected escribir(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected elegirFiltro(clave: string): void {
    this.filtro.set(clave);
  }

  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtro.set('todas');
  }

  reintentar(): void {
    this.consulta.reload();
  }
}

function coincideConEstado(estado: string, opcion: FiltroEstado): boolean {
  return opcion.estados.length === 0 || opcion.estados.includes(estado);
}
