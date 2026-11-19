import { Component, computed, inject, signal } from '@angular/core';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { TIPOS_DOCUMENTO } from '../../models/usuario.models';
import { CambiarContrasena } from '../../components/cambiar-contrasena/cambiar-contrasena';
import { EditarPerfil } from '../../components/editar-perfil/editar-perfil';
import { CuentaService } from '../../services/cuenta.service';

const NOMBRES_ROL: Record<string, string> = {
  HUESPED: 'Huésped',
  ANFITRION: 'Anfitrión',
  ADMINISTRADOR: 'Administrador',
};

@Component({
  selector: 'app-mi-cuenta',
  imports: [EditarPerfil, CambiarContrasena],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.css',
})
export class MiCuenta {
  readonly cuenta = inject(CuentaService).actual;
  readonly editando = signal(false);
  readonly aviso = signal<string | null>(null);

  readonly datos = computed(() => (this.cuenta.hasValue() ? this.cuenta.value() : null));

  readonly iniciales = computed(() => {
    const datos = this.datos();
    return datos
      ? `${datos.nombre.trim().charAt(0)}${datos.apellido.trim().charAt(0)}`.toUpperCase()
      : '';
  });

  readonly nombreRol = computed(() => {
    const rol = this.datos()?.rol ?? '';
    return NOMBRES_ROL[rol.toUpperCase()] ?? rol;
  });

  readonly tipoDocumento = computed(() => {
    const tipo = this.datos()?.tipoDocumento ?? '';
    return TIPOS_DOCUMENTO.find((opcion) => opcion.valor === tipo)?.etiqueta ?? tipo;
  });

  readonly error = computed(() =>
    !this.cuenta.isLoading() && this.cuenta.error()
      ? mensajeDeError(this.cuenta.error(), 'No pudimos cargar los datos de tu cuenta.')
      : null,
  );

  editar(): void {
    this.aviso.set(null);
    this.editando.set(true);
  }

  alGuardar(mensaje: string): void {
    this.editando.set(false);
    this.aviso.set(mensaje);
    this.cuenta.reload();
  }

  reintentar(): void {
    this.cuenta.reload();
  }
}
