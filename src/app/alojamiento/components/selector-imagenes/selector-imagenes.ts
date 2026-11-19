import {
  Component,
  DestroyRef,
  PendingTasks,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

export const MAX_IMAGENES = 10;
export const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;
export const FORMATOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'] as const;

type FormatoImagen = (typeof FORMATOS_IMAGEN)[number];

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const texto = (bytes: Uint8Array, desde: number, hasta: number) =>
  String.fromCodePoint(...bytes.subarray(desde, hasta));

function formatoPorFirma(bytes: Uint8Array): FormatoImagen | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (PNG.every((valor, indice) => bytes[indice] === valor)) {
    return 'image/png';
  }
  if (texto(bytes, 0, 4) === 'RIFF' && texto(bytes, 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

async function leerFormato(archivo: File): Promise<FormatoImagen | null> {
  try {
    return formatoPorFirma(new Uint8Array(await archivo.slice(0, 12).arrayBuffer()));
  } catch {
    return null;
  }
}

function conFormato(archivo: File, formato: FormatoImagen): File {
  return archivo.type === formato
    ? archivo
    : new File([archivo], archivo.name, { type: formato, lastModified: archivo.lastModified });
}

@Component({
  selector: 'app-selector-imagenes',
  templateUrl: './selector-imagenes.html',
  styleUrl: './selector-imagenes.css',
})
export class SelectorImagenes {
  private readonly urls = new Map<File, string>();
  private readonly tareas = inject(PendingTasks);
  private readonly destruccion = inject(DestroyRef);

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
    this.destruccion.onDestroy(() => {
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
    if (!nuevos.length) {
      return;
    }
    void this.tareas.run(async () => {
      const formatos = await Promise.all(nuevos.map(leerFormato));
      if (!this.destruccion.destroyed) {
        this.aplicar(nuevos, formatos);
      }
    });
  }

  private aplicar(nuevos: File[], formatos: (FormatoImagen | null)[]): void {
    const avisos: string[] = [];
    const aceptados: File[] = [];
    let disponibles = MAX_IMAGENES - this.archivos().length;

    nuevos.forEach((archivo, indice) => {
      const formato = formatos[indice];
      if (!formato) {
        avisos.push(`${archivo.name}: formato no permitido (usa JPG, PNG o WEBP).`);
      } else if (archivo.size > TAMANO_MAXIMO_BYTES) {
        avisos.push(`${archivo.name}: supera los 5 MB.`);
      } else if (disponibles <= 0) {
        avisos.push(`${archivo.name}: ya tienes el máximo de ${MAX_IMAGENES} imágenes.`);
      } else {
        aceptados.push(conFormato(archivo, formato));
        disponibles--;
      }
    });

    this.avisos.set(avisos);
    if (aceptados.length) {
      this.archivos.update((lista) => [...lista, ...aceptados]);
    }
  }
}
