import {
  Component,
  ElementRef,
  Renderer2,
  contentChild,
  effect,
  inject,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-campo-contrasena',
  templateUrl: './campo-contrasena.html',
  styleUrl: './campo-contrasena.css',
})
export class CampoContrasena {
  private readonly campo = contentChild.required<ElementRef<HTMLInputElement>>('campo');
  private readonly renderer = inject(Renderer2);

  readonly visible = signal(false);

  constructor() {
    effect(() => {
      this.renderer.setAttribute(
        this.campo().nativeElement,
        'type',
        this.visible() ? 'text' : 'password',
      );
    });
  }

  alternar(): void {
    this.visible.update((visible) => !visible);
  }
}
