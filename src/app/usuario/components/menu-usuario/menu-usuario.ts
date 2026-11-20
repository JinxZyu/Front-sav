import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SesionService } from '../../../config/auth/sesion.service';
import { CuentaService } from '../../services/cuenta.service';

const NOMBRES_ROL = {
  HUESPED: 'Huésped',
  ANFITRION: 'Anfitrión',
  ADMINISTRADOR: 'Administrador',
  AUDITOR_OPERACION: 'Auditor de operación',
} as const;

@Component({
  selector: 'app-menu-usuario',
  templateUrl: './menu-usuario.html',
  styleUrl: './menu-usuario.css',
  imports: [RouterLink],
  host: {
    '(document:click)': 'cerrarSiEsAfuera($event)',
    '(document:keydown.escape)': 'cerrarConEscape()',
  },
})
export class MenuUsuario {
  private readonly router = inject(Router);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly disparador = viewChild.required<ElementRef<HTMLButtonElement>>('disparador');
  protected readonly sesion = inject(SesionService);

  readonly abierto = signal(false);

  readonly cuenta = inject(CuentaService).actual;

  readonly cargando = computed(() => !this.cuenta.hasValue() && !this.cuenta.error());

  readonly nombre = computed(() => {
    if (this.cuenta.hasValue()) {
      const { nombre, apellido } = this.cuenta.value();
      return `${nombre} ${apellido}`.trim();
    }
    return this.cuenta.error() ? (this.sesion.correo() ?? '') : '';
  });

  readonly primerNombre = computed(() => this.nombre().split(/[\s@]/)[0] ?? '');

  readonly iniciales = computed(() => {
    if (this.cuenta.hasValue()) {
      const { nombre, apellido } = this.cuenta.value();
      return `${nombre.trim().charAt(0)}${apellido.trim().charAt(0)}`.toUpperCase();
    }
    return this.nombre().charAt(0).toUpperCase();
  });

  readonly nombreRol = computed(() => {
    const rol = this.sesion.rol();
    return rol ? NOMBRES_ROL[rol] : '';
  });

  alternar(): void {
    this.abierto.update((abierto) => !abierto);
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  cerrarConEscape(): void {
    if (!this.abierto()) {
      return;
    }
    const enfocadoAdentro = this.elemento.nativeElement.contains(document.activeElement);
    this.cerrar();
    if (enfocadoAdentro) {
      this.disparador().nativeElement.focus();
    }
  }

  cerrarSiEsAfuera(evento: Event): void {
    if (!this.elemento.nativeElement.contains(evento.target as Node | null)) {
      this.cerrar();
    }
  }

  cerrarSesion(): void {
    this.cerrar();
    this.sesion.cerrar();
    void this.router.navigateByUrl('/usuario/login');
  }
}
