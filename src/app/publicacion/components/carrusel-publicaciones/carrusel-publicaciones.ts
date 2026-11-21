import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TarjetaPublicacion } from '../../../alojamiento/components/tarjeta-publicacion/tarjeta-publicacion';
import { ResumenPublicacion } from '../../../alojamiento/models/alojamiento.models';

let siguienteId = 0;

@Component({
  selector: 'app-carrusel-publicaciones',
  imports: [RouterLink, TarjetaPublicacion],
  templateUrl: './carrusel-publicaciones.html',
  styleUrl: './carrusel-publicaciones.css',
})
export class CarruselPublicaciones {
  readonly titulo = input.required<string>();
  readonly publicaciones = input.required<readonly ResumenPublicacion[]>();
  readonly verTodos = input<Record<string, string> | null>(null);

  protected readonly id = `carrusel-${++siguienteId}`;
  protected readonly alInicio = signal(true);
  protected readonly alFinal = signal(false);

  private readonly pista = viewChild.required<ElementRef<HTMLElement>>('pista');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observador = new ResizeObserver(() => this.actualizarBordes());
      observador.observe(this.pista().nativeElement);
      destroyRef.onDestroy(() => observador.disconnect());
    });
  }

  protected desplazar(sentido: 1 | -1): void {
    const pista = this.pista().nativeElement;
    pista.scrollBy({ left: sentido * pista.clientWidth * 0.9, behavior: 'smooth' });
  }

  protected actualizarBordes(): void {
    const pista = this.pista().nativeElement;
    this.alInicio.set(pista.scrollLeft <= 1);
    this.alFinal.set(pista.scrollLeft + pista.clientWidth >= pista.scrollWidth - 1);
  }
}
