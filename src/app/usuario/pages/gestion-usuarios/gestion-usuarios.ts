import { Component, DestroyRef, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { SesionService } from '../../../config/auth/sesion.service';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { FilaUsuario } from '../../components/fila-usuario/fila-usuario';
import { UsuarioAdministrado } from '../../models/usuario.models';
import { AdministracionUsuariosService } from '../../services/administracion-usuarios.service';

type FiltroRestriccion = 'todas' | 'restringidas' | 'sin-restriccion';

@Component({
  selector: 'app-gestion-usuarios',
  imports: [ReactiveFormsModule, FilaUsuario],
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.css',
})
export class GestionUsuarios {
  private readonly servicio = inject(AdministracionUsuariosService);
  private readonly sesion = inject(SesionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly usuarios = rxResource({ stream: () => this.servicio.listar() });

  readonly lista = linkedSignal<UsuarioAdministrado[] | null, UsuarioAdministrado[] | null>({
    source: () => (this.usuarios.hasValue() ? this.usuarios.value() : null),
    computation: (actual, previo) => actual ?? previo?.value ?? null,
  });

  readonly busqueda = signal('');
  readonly filtro = signal<FiltroRestriccion>('todas');
  readonly aviso = signal<string | null>(null);

  readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const filtro = this.filtro();
    return (this.lista() ?? []).filter((usuario) => {
      const coincide =
        !texto ||
        `${usuario.nombre} ${usuario.apellido} ${usuario.correo}`.toLowerCase().includes(texto);
      const pasaFiltro = filtro === 'todas' || (filtro === 'restringidas') === usuario.restringido;
      return coincide && pasaFiltro;
    });
  });

  readonly totalRestringidas = computed(
    () => (this.lista() ?? []).filter((usuario) => usuario.restringido).length,
  );

  readonly error = computed(() =>
    !this.usuarios.isLoading() && this.usuarios.error()
      ? mensajeDeError(this.usuarios.error(), 'No pudimos cargar los usuarios.')
      : null,
  );

  readonly correoDesbloqueo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  readonly desbloqueando = signal(false);
  readonly errorDesbloqueo = signal<string | null>(null);
  readonly avisoDesbloqueo = signal<string | null>(null);

  esPropia(usuario: UsuarioAdministrado): boolean {
    return usuario.correo.toLowerCase() === (this.sesion.correo() ?? '').toLowerCase();
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
  }

  filtrar(valor: string): void {
    this.filtro.set(valor as FiltroRestriccion);
  }

  alActualizar(mensaje: string): void {
    this.aviso.set(mensaje);
    this.usuarios.reload();
  }

  reintentar(): void {
    this.usuarios.reload();
  }

  desbloqueoInvalido(): boolean {
    return (
      this.correoDesbloqueo.invalid &&
      (this.correoDesbloqueo.touched || this.correoDesbloqueo.dirty)
    );
  }

  desbloquear(): void {
    if (this.desbloqueando()) {
      return;
    }
    this.errorDesbloqueo.set(null);
    this.avisoDesbloqueo.set(null);
    if (this.correoDesbloqueo.invalid) {
      this.correoDesbloqueo.markAsTouched();
      return;
    }
    this.desbloqueando.set(true);
    this.servicio
      .reactivarBloqueo(this.correoDesbloqueo.value.trim().toLowerCase())
      .pipe(
        finalize(() => this.desbloqueando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (mensaje) => {
          this.avisoDesbloqueo.set(mensaje || 'La cuenta ha sido reactivada correctamente.');
          this.correoDesbloqueo.reset();
        },
        error: (error: unknown) =>
          this.errorDesbloqueo.set(mensajeDeError(error, 'No pudimos reactivar la cuenta.')),
      });
  }
}
