import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SesionService } from './config/auth/sesion.service';

const NOMBRES_ROL = {
  HUESPED: 'Huésped',
  ANFITRION: 'Anfitrión',
  ADMINISTRADOR: 'Administrador',
} as const;

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  protected readonly sesion = inject(SesionService);
  protected readonly nombreRol = computed(() => {
    const rol = this.sesion.rol();
    return rol ? NOMBRES_ROL[rol] : '';
  });

  cerrarSesion(): void {
    this.sesion.cerrar();
    void this.router.navigateByUrl('/usuario/login');
  }
}
