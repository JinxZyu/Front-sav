import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SECCIONES_ADMINISTRACION } from '../../models/secciones.models';

@Component({
  selector: 'app-panel-administracion',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './panel-administracion.html',
  styleUrl: './panel-administracion.css',
})
export class PanelAdministracion {
  protected readonly secciones = SECCIONES_ADMINISTRACION;
}
