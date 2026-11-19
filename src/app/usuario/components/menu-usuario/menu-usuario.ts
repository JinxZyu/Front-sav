import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SesionService } from '../../../config/auth/sesion.service';
import { CuentaService } from '../../services/cuenta.service';

const NOMBRES_ROL = {
  HUESPED: 'Huésped',
  ANFITRION: 'Anfitrión',
  ADMINISTRADOR: 'Administrador',
} as const;

@Component({
  selector: 'app-menu-usuario',
  templateUrl: './menu-usuario.html',
  styleUrl: './menu-usuario.css',
  host: {
    '(document:click)': 'cerrarSiEsAfuera($event)',
    '(document:keydown.escape)': 'cerrar()',
  },
})
export class MenuUsuario {
  private readonly router = inject(Router);
  private readonly cuentaService = inject(CuentaService);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly sesion = inject(SesionService);

  readonly abierto = signal(false);

  readonly cuenta = rxResource({
    params: () => this.sesion.token() ?? undefined,
    stream: () => this.cuentaService.consultar(),
  });

  readonly nombre = computed(() => {
    const cuenta = this.cuenta.hasValue() ? this.cuenta.value() : null;
    const completo = `${cuenta?.nombre ?? ''} ${cuenta?.apellido ?? ''}`.trim();
    return completo || (this.sesion.correo() ?? '');
  });

  readonly primerNombre = computed(() => this.nombre().split(/[\s@]/)[0] ?? '');

  readonly iniciales = computed(() => {
    const cuenta = this.cuenta.hasValue() ? this.cuenta.value() : null;
    const letras = cuenta
      ? `${cuenta.nombre.trim().charAt(0)}${cuenta.apellido.trim().charAt(0)}`
      : (this.sesion.correo() ?? '').charAt(0);
    return letras.toUpperCase();
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
