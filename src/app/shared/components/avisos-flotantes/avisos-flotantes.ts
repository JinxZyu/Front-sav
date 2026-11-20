import { Component, inject } from '@angular/core';
import { AvisosService } from '../../services/avisos.service';

@Component({
  selector: 'app-avisos-flotantes',
  templateUrl: './avisos-flotantes.html',
  styleUrl: './avisos-flotantes.css',
})
export class AvisosFlotantes {
  protected readonly servicio = inject(AvisosService);
}
