import { Component, DestroyRef, effect, inject, input, model, signal } from '@angular/core';

export const MAX_IMAGENES = 10;
export const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;
export const FORMATOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'] as const;

@Component({
  selector: 'app-selector-imagenes',
  templateUrl: './selector-imagenes.html',
  styleUrl: './selector-imagenes.css',
})
export class SelectorImagenes {
  private readonly urls = new Map<File, string>();

  readonly archivos = model<File[]>([]);
  readonly deshabilitado = input(false);
  readonly invalido = input(false);
  readonly idDescripcion = input<string | null>(null);

  readonly avisos = signal<string[]>([]);
  readonly arrastrando = signal(false);
  readonly formatos = FORMATOS_IMAGEN.join(',');
  readonly maximo = MAX_IMAGENES;

  constructor() {
    effect(() => {
      const actuales = new Set(this.archivos());
      for (const [archivo, url] of this.urls) {
        if (!actuales.has(archivo)) {
          URL.revokeObjectURL(url);
          this.urls.delete(archivo);
        }
      }
    });
    inject(DestroyRef).onDestroy(() => {
      for (const url of this.urls.values()) {
        URL.revokeObjectURL(url);
      }
      this.urls.clear();
    });
  }

  vista(archivo: File): string {
    let url = this.urls.get(archivo);
    if (!url) {
      url = URL.createObjectURL(archivo);
      this.urls.set(archivo, url);
    }
    return url;
  }

  alSeleccionar(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    this.agregar([...(campo.files ?? [])]);
    campo.value = '';
  }

  alSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(false);
    if (!this.deshabilitado()) {
      this.agregar([...(evento.dataTransfer?.files ?? [])]);
    }
  }

  alArrastrar(evento: DragEvent): void {
    evento.preventDefault();
    if (!this.deshabilitado()) {
      this.arrastrando.set(true);
    }
  }

  quitar(archivo: File): void {
    if (this.deshabilitado()) {
      return;
    }
    this.avisos.set([]);
    this.archivos.update((lista) => lista.filter((actual) => actual !== archivo));
  }

  private agregar(nuevos: File[]): void {
    const avisos: string[] = [];
    const aceptados: File[] = [];
    let disponibles = MAX_IMAGENES - this.archivos().length;

    for (const archivo of nuevos) {
      if (!(FORMATOS_IMAGEN as readonly string[]).includes(archivo.type)) {
        avisos.push(`${archivo.name}: formato no permitido (usa JPG, PNG o WEBP).`);
      } else if (archivo.size > TAMANO_MAXIMO_BYTES) {
        avisos.push(`${archivo.name}: supera los 5 MB.`);
      } else if (disponibles <= 0) {
        avisos.push(`${archivo.name}: ya tienes el máximo de ${MAX_IMAGENES} imágenes.`);
      } else {
        aceptados.push(archivo);
        disponibles--;
      }
    }

    this.avisos.set(avisos);
    if (aceptados.length) {
      this.archivos.update((lista) => [...lista, ...aceptados]);
    }
  }
}
