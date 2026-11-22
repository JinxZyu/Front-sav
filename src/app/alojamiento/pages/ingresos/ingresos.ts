import { Component } from '@angular/core';
import { ResumenIngresos } from '../../components/resumen-ingresos/resumen-ingresos';

/** Apartado del anfitrión con lo que ha generado: ganancias, comisión de la plataforma y devoluciones. */
@Component({
  selector: 'app-ingresos',
  imports: [ResumenIngresos],
  templateUrl: './ingresos.html',
  styleUrl: './ingresos.css',
})
export class Ingresos {}
