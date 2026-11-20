import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SECCIONES_ADMINISTRACION, SeccionAdministracion } from '../../models/secciones.models';

@Component({
  selector: 'app-panel-administracion',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './panel-administracion.html',
  styleUrl: './panel-administracion.css',
})
export class PanelAdministracion {
  private readonly datos = inject(ActivatedRoute).snapshot.data;

  protected readonly secciones: readonly SeccionAdministracion[] =
    this.datos['secciones'] ?? SECCIONES_ADMINISTRACION;
  protected readonly nombre: string = this.datos['nombre'] ?? 'Secciones de administración';
}
