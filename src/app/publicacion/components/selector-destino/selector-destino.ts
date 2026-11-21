import { Component, computed, effect, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DestinoSugerido } from '../../models/catalogo.models';

const MAXIMO_OPCIONES = 8;

const sinTildes = (texto: string) =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();

@Component({
  selector: 'app-selector-destino',
  imports: [ReactiveFormsModule],
  templateUrl: './selector-destino.html',
  styleUrl: './selector-destino.css',
})
export class SelectorDestino {
  readonly control = input.required<FormControl<string>>();
  readonly destinos = input<readonly DestinoSugerido[]>([]);
  readonly idEntrada = input('destino');

  protected readonly abierto = signal(false);
  protected readonly activo = signal(-1);
  private readonly texto = signal('');

  protected readonly idLista = computed(() => `${this.idEntrada()}-opciones`);
  protected readonly opciones = computed(() => {
    const buscado = sinTildes(this.texto());
    return this.destinos()
      .filter((destino) => sinTildes(destino.ciudad).includes(buscado))
      .slice(0, MAXIMO_OPCIONES);
  });
  protected readonly visible = computed(() => this.abierto() && this.opciones().length > 0);

  constructor() {
    effect((alLimpiar) => {
      const control = this.control();
      this.texto.set(control.value ?? '');
      const suscripcion = control.valueChanges.subscribe((valor) => {
        this.texto.set(valor ?? '');
        this.activo.set(-1);
      });
      alLimpiar(() => suscripcion.unsubscribe());
    });
  }

  protected abrir(): void {
    if (!this.abierto()) {
      this.activo.set(-1);
      this.abierto.set(true);
    }
  }

  protected cerrar(): void {
    this.abierto.set(false);
    this.activo.set(-1);
  }

  protected alEscribir(): void {
    this.activo.set(-1);
    this.abierto.set(true);
  }

  protected alTeclear(evento: KeyboardEvent): void {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      this.abrir();
      const total = this.opciones().length;
      if (total > 0) {
        const paso = evento.key === 'ArrowDown' ? 1 : -1;
        this.activo.update((actual) => (actual + paso + total) % total);
      }
    } else if (evento.key === 'Enter' && this.visible() && this.activo() >= 0) {
      evento.preventDefault();
      this.elegir(this.opciones()[this.activo()]);
    } else if (evento.key === 'Escape' && this.visible()) {
      evento.preventDefault();
      this.cerrar();
    }
  }

  protected elegir(destino: DestinoSugerido): void {
    this.control().setValue(destino.ciudad);
    this.control().markAsDirty();
    this.cerrar();
  }

  protected detalle({ pais, total }: DestinoSugerido): string {
    const cantidad = `${total} ${total === 1 ? 'alojamiento' : 'alojamientos'}`;
    return pais ? `${pais} · ${cantidad}` : cantidad;
  }

  protected idOpcion(indice: number): string {
    return `${this.idEntrada()}-opcion-${indice}`;
  }
}
