import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SesionService } from './config/auth/sesion.service';
import { CampanaNotificaciones } from './notificacion/components/campana-notificaciones/campana-notificaciones';
import { AvisosFlotantes } from './shared/components/avisos-flotantes/avisos-flotantes';
import { MenuUsuario } from './usuario/components/menu-usuario/menu-usuario';

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CampanaNotificaciones,
    MenuUsuario,
    AvisosFlotantes,
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly sesion = inject(SesionService);
}
