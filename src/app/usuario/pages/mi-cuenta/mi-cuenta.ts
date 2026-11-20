import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { AvisosService } from '../../../shared/services/avisos.service';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { Cuenta, TIPOS_DOCUMENTO } from '../../models/usuario.models';
import { CambiarContrasena } from '../../components/cambiar-contrasena/cambiar-contrasena';
import { DesactivarCuenta } from '../../components/desactivar-cuenta/desactivar-cuenta';
import { EditarPerfil } from '../../components/editar-perfil/editar-perfil';
import { CuentaService } from '../../services/cuenta.service';

const NOMBRES_ROL: Record<string, string> = {
  HUESPED: 'Huésped',
  ANFITRION: 'Anfitrión',
  ADMINISTRADOR: 'Administrador',
  AUDITOR_OPERACION: 'Auditor de operación',
};

@Component({
  selector: 'app-mi-cuenta',
  imports: [EditarPerfil, CambiarContrasena, DesactivarCuenta],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.css',
})
export class MiCuenta {
  private readonly avisos = inject(AvisosService);
  readonly cuenta = inject(CuentaService).actual;
  readonly editando = signal(false);

  readonly datos = linkedSignal<Cuenta | null, Cuenta | null>({
    source: () => (this.cuenta.hasValue() ? this.cuenta.value() : null),
    computation: (actual, previo) => actual ?? previo?.value ?? null,
  });

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
    if (this.cuenta.isLoading()) {
      return;
    }
    this.editando.set(true);
  }

  alGuardar(mensaje: string): void {
    this.editando.set(false);
    this.avisos.mostrar('Perfil actualizado', mensaje || null);
    this.cuenta.reload();
  }

  reintentar(): void {
    this.cuenta.reload();
  }
}
