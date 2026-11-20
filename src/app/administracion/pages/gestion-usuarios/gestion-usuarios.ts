import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';
import { SesionService } from '../../../config/auth/sesion.service';
import { AvisosService } from '../../../shared/services/avisos.service';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { FormularioMotivo } from '../../components/formulario-motivo/formulario-motivo';
import {
  MAXIMO_MOTIVO_RESTRICCION,
  NOMBRES_ESTADO_CUENTA,
  NOMBRES_ROL,
  UsuarioAdministrado,
} from '../../models/usuario-administrado.models';
import { GestionUsuariosService } from '../../services/gestion-usuarios.service';
import { normalizar } from '../../utils/texto';

type TipoAccion = 'restringir' | 'levantar';

interface AccionEnCurso {
  idUsuario: string;
  tipo: TipoAccion;
}

@Component({
  selector: 'app-gestion-usuarios',
  imports: [FormularioMotivo],
  templateUrl: './gestion-usuarios.html',
  styleUrls: ['../../styles/pagina-administracion.css', './gestion-usuarios.css'],
})
export class GestionUsuarios {
  private readonly servicio = inject(GestionUsuariosService);
  private readonly avisos = inject(AvisosService);
  private readonly correoPropio = inject(SesionService).correo()?.toLowerCase() ?? null;

  protected readonly maximoMotivo = MAXIMO_MOTIVO_RESTRICCION;
  protected readonly busqueda = signal('');
  protected readonly soloRestringidos = signal(false);
  protected readonly accion = signal<AccionEnCurso | null>(null);
  protected readonly enviando = signal(false);
  protected readonly errorAccion = signal<string | null>(null);

  protected readonly consulta = rxResource({ stream: () => this.servicio.listar() });

  protected readonly todos = computed(() =>
    this.consulta.hasValue()
      ? [...this.consulta.value()].sort((a, b) =>
          nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'),
        )
      : null,
  );

  protected readonly restringidos = computed(
    () => this.todos()?.filter((usuario) => usuario.restringido).length ?? 0,
  );

  protected readonly usuarios = computed(() => {
    const todos = this.todos();
    if (!todos) {
      return null;
    }
    const texto = normalizar(this.busqueda().trim());
    return todos.filter(
      (usuario) =>
        (!this.soloRestringidos() || usuario.restringido) &&
        (!texto || normalizar(`${nombreCompleto(usuario)} ${usuario.correo}`).includes(texto)),
    );
  });

  protected readonly error = computed(() =>
    this.consulta.status() === 'error'
      ? mensajeDeError(this.consulta.error(), 'No pudimos consultar los usuarios.')
      : null,
  );

  protected nombre(usuario: UsuarioAdministrado): string {
    return nombreCompleto(usuario) || usuario.correo;
  }

  protected rol(usuario: UsuarioAdministrado): string {
    return usuario.rol ? NOMBRES_ROL[usuario.rol] : 'Sin rol';
  }

  protected estado(usuario: UsuarioAdministrado): string | null {
    return usuario.estado ? NOMBRES_ESTADO_CUENTA[usuario.estado] : null;
  }

  protected esPropio(usuario: UsuarioAdministrado): boolean {
    return usuario.correo.toLowerCase() === this.correoPropio;
  }

  protected enCurso(usuario: UsuarioAdministrado, tipo: TipoAccion): boolean {
    const accion = this.accion();
    return accion?.idUsuario === usuario.idUsuario && accion.tipo === tipo;
  }

  protected buscar(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected abrir(usuario: UsuarioAdministrado, tipo: TipoAccion): void {
    if (this.enviando()) {
      return;
    }
    this.errorAccion.set(null);
    this.accion.set({ idUsuario: usuario.idUsuario, tipo });
  }

  protected cerrar(): void {
    if (!this.enviando()) {
      this.accion.set(null);
      this.errorAccion.set(null);
    }
  }

  protected restringir(usuario: UsuarioAdministrado, motivo: string): void {
    this.ejecutar(
      this.servicio.restringir(usuario.idUsuario, motivo),
      `Restringiste la cuenta de ${this.nombre(usuario)}`,
      'No pudimos restringir la cuenta.',
    );
  }

  protected levantar(usuario: UsuarioAdministrado): void {
    this.ejecutar(
      this.servicio.levantarRestriccion(usuario.idUsuario),
      `Levantaste la restricción de ${this.nombre(usuario)}`,
      'No pudimos levantar la restricción.',
    );
  }

  private ejecutar(peticion: Observable<string>, titulo: string, porDefecto: string): void {
    if (this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.errorAccion.set(null);
    peticion.pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: (mensaje) => {
        this.accion.set(null);
        this.avisos.mostrar(titulo, mensaje || null);
        this.consulta.reload();
      },
      error: (error: unknown) => this.errorAccion.set(mensajeDeError(error, porDefecto)),
    });
  }
}

function nombreCompleto(usuario: UsuarioAdministrado): string {
  return `${usuario.nombre ?? ''} ${usuario.apellido ?? ''}`.trim();
}
