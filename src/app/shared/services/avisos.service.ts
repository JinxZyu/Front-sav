import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  titulo: string;
  detalle: string | null;
}

export const DURACION_AVISO = 6000;

@Injectable({ providedIn: 'root' })
export class AvisosService {
  private siguiente = 0;
  private readonly lista = signal<Aviso[]>([]);

  readonly avisos = this.lista.asReadonly();

  mostrar(titulo: string, detalle: string | null = null): void {
    const aviso: Aviso = { id: ++this.siguiente, titulo, detalle };
    this.lista.update((avisos) => [...avisos, aviso]);
    setTimeout(() => this.cerrar(aviso.id), DURACION_AVISO);
  }

  cerrar(id: number): void {
    this.lista.update((avisos) => avisos.filter((aviso) => aviso.id !== id));
  }
}
