import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { PATRON_CON_TEXTO } from '../../../shared/utils/validadores';
import { UsuarioAdministrado } from '../../models/usuario.models';
import { AdministracionUsuariosService } from '../../services/administracion-usuarios.service';

type Modo = 'ver' | 'restringir' | 'levantar';

const NOMBRES_ROL: Record<string, string> = {
  HUESPED: 'Huésped',
  ANFITRION: 'Anfitrión',
  ADMINISTRADOR: 'Administrador',
};

const NOMBRES_ESTADO: Record<string, string> = {
  ACTIVA: 'Activa',
  INACTIVA: 'Desactivada',
  PENDIENTE_VERIFICACION: 'Sin verificar',
};

@Component({
  selector: 'li[app-fila-usuario]',
  imports: [ReactiveFormsModule],
  templateUrl: './fila-usuario.html',
  styleUrl: './fila-usuario.css',
})
export class FilaUsuario {
  private readonly servicio = inject(AdministracionUsuariosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly campoMotivo = viewChild<ElementRef<HTMLTextAreaElement>>('campoMotivo');
  private readonly botonAccion = viewChild<ElementRef<HTMLButtonElement>>('botonAccion');

  readonly usuario = input.required<UsuarioAdministrado>();
  readonly bloqueado = input(false);
  readonly esPropia = input(false);
  readonly actualizado = output<string>();

  readonly modo = signal<Modo>('ver');
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  readonly motivo = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.pattern(PATRON_CON_TEXTO),
      Validators.maxLength(255),
    ],
  });

  readonly nombreCompleto = computed(() =>
    `${this.usuario().nombre} ${this.usuario().apellido}`.trim(),
  );
  readonly nombreRol = computed(() => {
    const rol = this.usuario().rol ?? '';
    return NOMBRES_ROL[rol.toUpperCase()] ?? rol;
  });
  readonly nombreEstado = computed(() => {
    const estado = this.usuario().estado ?? '';
    return NOMBRES_ESTADO[estado] ?? estado;
  });
  readonly claseEstado = computed(() => (this.usuario().estado ?? '').toLowerCase());
  readonly esAnfitrion = computed(() => this.usuario().rol?.toUpperCase() === 'ANFITRION');

  abrir(modo: Exclude<Modo, 'ver'>): void {
    if (this.bloqueado() || this.enviando()) {
      return;
    }
    this.error.set(null);
    this.motivo.reset();
    this.modo.set(modo);
    afterNextRender(
      () => {
        if (modo === 'restringir') {
          this.campoMotivo()?.nativeElement.focus();
        }
      },
      { injector: this.injector },
    );
  }

  cancelar(): void {
    if (this.enviando()) {
      return;
    }
    this.modo.set('ver');
    afterNextRender(() => this.botonAccion()?.nativeElement.focus(), { injector: this.injector });
  }

  restringir(): void {
    if (this.enviando()) {
      return;
    }
    if (this.motivo.invalid) {
      this.motivo.markAsTouched();
      return;
    }
    this.ejecutar(
      this.servicio.restringir(this.usuario().idUsuario, this.motivo.value.trim()),
      'La cuenta ha sido restringida correctamente.',
    );
  }

  levantar(): void {
    if (this.enviando()) {
      return;
    }
    this.ejecutar(
      this.servicio.levantarRestriccion(this.usuario().idUsuario),
      'La restricción administrativa ha sido levantada correctamente.',
    );
  }

  motivoConError(): boolean {
    return this.motivo.invalid && (this.motivo.touched || this.motivo.dirty);
  }

  private ejecutar(operacion: Observable<string>, porDefecto: string): void {
    this.error.set(null);
    this.enviando.set(true);
    operacion
      .pipe(
        finalize(() => this.enviando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (mensaje) => {
          this.modo.set('ver');
          this.actualizado.emit(`${this.nombreCompleto()}: ${mensaje || porDefecto}`);
        },
        error: (error: unknown) =>
          this.error.set(mensajeDeError(error, 'No pudimos completar la operación.')),
      });
  }
}
