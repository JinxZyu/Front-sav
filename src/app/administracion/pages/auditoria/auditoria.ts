import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { formatearFechaHora } from '../../../alojamiento/utils/formato';
import { mensajeLegible } from '../../../notificacion/utils/mensaje-notificacion';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import {
  ENTIDADES_AUDITORIA,
  EventoAuditoria,
  FILTROS_AUDITORIA_VACIOS,
  FiltrosAuditoria,
  RESULTADOS_AUDITORIA,
  Resultado,
  accionAuditoria,
  entidadAuditoria,
  humanizarCodigo,
  nombreCampoDetalle,
  resultadoAuditoria,
} from '../../models/auditoria.models';
import { UsuarioAdministrado } from '../../models/usuario-administrado.models';
import { AuditoriaService } from '../../services/auditoria.service';
import { GestionPublicacionesService } from '../../services/gestion-publicaciones.service';
import { GestionUsuariosService } from '../../services/gestion-usuarios.service';

interface CampoDetalle {
  nombre: string;
  valor: string;
}

interface FilaAuditoria {
  evento: EventoAuditoria;
  accion: string;
  resultado: Resultado;
  quien: string;
  entidad: string | null;
  referencia: string | null;
  enlace: string[] | null;
  detalle: CampoDetalle[];
}

const CODIGO = /^[A-Z][A-Z0-9_]*$/;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function valorDetalle(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') {
    return '—';
  }
  if (typeof valor === 'boolean') {
    return valor ? 'Sí' : 'No';
  }
  if (typeof valor === 'number') {
    return String(valor);
  }
  if (typeof valor === 'string') {
    if (FECHA_ISO.test(valor)) {
      return formatearFechaHora(valor) || valor;
    }
    const legible = mensajeLegible(valor);
    return legible === valor && CODIGO.test(valor) && valor.length > 3
      ? humanizarCodigo(valor)
      : legible;
  }
  return JSON.stringify(valor);
}

function leerDetalle(detalle: string | null): CampoDetalle[] {
  if (!detalle) {
    return [];
  }
  let datos: unknown;
  try {
    datos = JSON.parse(detalle);
  } catch {
    return [{ nombre: 'Detalle', valor: detalle }];
  }
  if (datos && typeof datos === 'object' && !Array.isArray(datos)) {
    return Object.entries(datos).map(([campo, valor]) => ({
      nombre: nombreCampoDetalle(campo),
      valor: valorDetalle(valor),
    }));
  }
  return [{ nombre: 'Detalle', valor: valorDetalle(datos) }];
}

function nombreUsuario(usuario: UsuarioAdministrado): string {
  return `${usuario.nombre} ${usuario.apellido}`.trim() || usuario.correo;
}

@Component({
  selector: 'app-auditoria',
  imports: [RouterLink],
  templateUrl: './auditoria.html',
  styleUrls: ['../../styles/pagina-administracion.css', './auditoria.css'],
})
export class Auditoria {
  private readonly servicio = inject(AuditoriaService);
  private readonly gestionUsuarios = inject(GestionUsuariosService);
  private readonly gestionPublicaciones = inject(GestionPublicacionesService);

  protected readonly entidades = ENTIDADES_AUDITORIA;
  protected readonly resultados = RESULTADOS_AUDITORIA;

  protected readonly filtros = signal<FiltrosAuditoria>(FILTROS_AUDITORIA_VACIOS);
  protected readonly pagina = linkedSignal({ source: this.filtros, computation: () => 0 });

  protected readonly hayFiltros = computed(() =>
    Object.values(this.filtros()).some((valor) => valor !== ''),
  );

  protected readonly fechasInvalidas = computed(() => {
    const { desde, hasta } = this.filtros();
    return desde !== '' && hasta !== '' && desde > hasta;
  });

  private readonly listaUsuarios = rxResource({
    stream: () => this.gestionUsuarios.listar().pipe(catchError(() => of([]))),
  });

  protected readonly usuarios = computed(() =>
    [...(this.listaUsuarios.value() ?? [])].sort((a, b) =>
      nombreUsuario(a).localeCompare(nombreUsuario(b), 'es'),
    ),
  );

  private readonly porId = computed(
    () => new Map(this.usuarios().map((usuario) => [usuario.idUsuario, usuario])),
  );

  private readonly listaPublicaciones = rxResource({
    stream: () => this.gestionPublicaciones.listar().pipe(catchError(() => of([]))),
  });

  private readonly titulos = computed(
    () =>
      new Map(
        (this.listaPublicaciones.value() ?? []).map((publicacion) => [
          publicacion.idPublicacion,
          publicacion.titulo,
        ]),
      ),
  );

  protected readonly consulta = rxResource({
    params: () =>
      this.fechasInvalidas() ? undefined : { filtros: this.filtros(), pagina: this.pagina() },
    stream: ({ params }) => this.servicio.consultar(params.filtros, params.pagina),
  });

  protected readonly datos = computed(() =>
    this.consulta.hasValue() ? (this.consulta.value() ?? null) : null,
  );

  protected readonly error = computed(() =>
    this.consulta.status() === 'error'
      ? mensajeDeError(this.consulta.error(), 'No pudimos consultar la auditoría.')
      : null,
  );

  protected readonly filas = computed<FilaAuditoria[]>(() =>
    (this.datos()?.eventos ?? []).map((evento) => this.fila(evento)),
  );

  protected readonly fecha = formatearFechaHora;

  protected nombre(usuario: UsuarioAdministrado): string {
    return nombreUsuario(usuario);
  }

  protected filtrar(campo: keyof FiltrosAuditoria, evento: Event): void {
    const valor = (evento.target as HTMLInputElement | HTMLSelectElement).value;
    this.filtros.update((filtros) => ({ ...filtros, [campo]: valor }));
  }

  protected limpiar(): void {
    this.filtros.set(FILTROS_AUDITORIA_VACIOS);
  }

  protected irA(pagina: number): void {
    this.pagina.set(pagina);
  }

  private fila(evento: EventoAuditoria): FilaAuditoria {
    const usuarios = this.porId();
    const autor = evento.idUsuario ? usuarios.get(evento.idUsuario) : undefined;
    const id = evento.idEntidadAfectada;
    let referencia = id ? id.slice(0, 8) : null;
    let enlace: string[] | null = null;
    if (id && evento.entidadAfectada === 'PUBLICACION') {
      enlace = ['/administracion/publicaciones', id];
      referencia = this.titulos().get(id) ?? referencia;
    } else if (id && evento.entidadAfectada === 'EXPORTACION_REPORTE') {
      enlace = ['/administracion/reportes', id];
    } else if (id && evento.entidadAfectada === 'USUARIO') {
      const afectado = usuarios.get(id);
      referencia = afectado ? nombreUsuario(afectado) : referencia;
    }
    const detalle = leerDetalle(evento.detalleJson);
    if (evento.idCorrelacion) {
      detalle.push({ nombre: 'Correlación', valor: evento.idCorrelacion });
    }
    return {
      evento,
      accion: accionAuditoria(evento.accion),
      resultado: resultadoAuditoria(evento.resultado),
      quien: evento.idUsuario
        ? autor
          ? `${nombreUsuario(autor)} · ${autor.correo}`
          : `Usuario ${evento.idUsuario.slice(0, 8)}`
        : 'Sistema',
      entidad: entidadAuditoria(evento.entidadAfectada),
      referencia,
      enlace,
      detalle,
    };
  }
}
