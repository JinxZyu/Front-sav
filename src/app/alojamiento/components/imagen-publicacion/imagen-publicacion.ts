import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { PublicacionAlojamientoService } from '../../services/publicacion-alojamiento.service';

@Component({
  selector: 'app-imagen-publicacion',
  templateUrl: './imagen-publicacion.html',
  styleUrl: './imagen-publicacion.css',
})
export class ImagenPublicacion {
  private readonly servicio = inject(PublicacionAlojamientoService);

  readonly ruta = input.required<string>();
  readonly descripcion = input.required<string>();

  protected readonly externa = computed(() => /^https?:\/\//i.test(this.ruta()));

  private readonly archivo = rxResource({
    params: () => (this.externa() ? undefined : this.ruta()),
    stream: ({ params }) => this.servicio.imagen(params),
  });

  protected readonly url = signal<string | null>(null);
  protected readonly falloAlMostrar = linkedSignal({ source: this.ruta, computation: () => false });
  protected readonly fallo = computed(
    () => this.archivo.status() === 'error' || this.falloAlMostrar(),
  );

  constructor() {
    effect((alLimpiar) => {
      const blob = this.archivo.hasValue() ? this.archivo.value() : undefined;
      if (!blob) {
        this.url.set(null);
        return;
      }
      const url = URL.createObjectURL(blob);
      this.url.set(url);
      alLimpiar(() => URL.revokeObjectURL(url));
    });
  }
}
