import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { estadoPublicacion } from '../../../alojamiento/models/alojamiento.models';
import { formatearFecha } from '../../../alojamiento/utils/formato';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { normalizar } from '../../utils/texto';
import { EN_REVISION, PublicacionAdministrada } from '../../models/publicacion-administrada.models';
import { GestionPublicacionesService } from '../../services/gestion-publicaciones.service';

type Filtro = 'revision' | 'todas';

@Component({
  selector: 'app-lista-publicaciones',
  imports: [RouterLink],
  templateUrl: './lista-publicaciones.html',
  styleUrls: ['../../styles/pagina-administracion.css', './lista-publicaciones.css'],
})
export class ListaPublicaciones {
  private readonly servicio = inject(GestionPublicacionesService);

  protected readonly estado = estadoPublicacion;
  protected readonly filtro = signal<Filtro>('revision');
  protected readonly busqueda = signal('');

  protected readonly consulta = rxResource({ stream: () => this.servicio.listar() });

  protected readonly todas = computed(() =>
    this.consulta.hasValue() ? this.consulta.value() : null,
  );

  protected readonly enRevision = computed(() =>
    (this.todas() ?? [])
      .filter((publicacion) => publicacion.estado === EN_REVISION)
      .sort((a, b) => fechaDeEnvio(a).localeCompare(fechaDeEnvio(b))),
  );

  protected readonly publicaciones = computed(() => {
    const todas = this.todas();
    if (!todas) {
      return null;
    }
    const base = this.filtro() === 'revision' ? this.enRevision() : todas;
    const texto = normalizar(this.busqueda().trim());
    return texto
      ? base.filter((publicacion) => normalizar(publicacion.titulo).includes(texto))
      : base;
  });

  protected readonly error = computed(() =>
    this.consulta.status() === 'error'
      ? mensajeDeError(this.consulta.error(), 'No pudimos consultar las publicaciones.')
      : null,
  );

  protected fecha(publicacion: PublicacionAdministrada): string {
    return publicacion.estado === EN_REVISION
      ? `Enviada a revisión el ${formatearFecha(fechaDeEnvio(publicacion))}`
      : `Creada el ${formatearFecha(publicacion.fechaCreacion)}`;
  }

  protected buscar(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }
}

function fechaDeEnvio(publicacion: PublicacionAdministrada): string {
  return publicacion.fechaActualizacion ?? publicacion.fechaCreacion;
}
