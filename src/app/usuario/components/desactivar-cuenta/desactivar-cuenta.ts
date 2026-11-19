import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { SesionService } from '../../../config/auth/sesion.service';
import { INICIO_SIN_SESION } from '../../../config/rutas';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { CuentaService } from '../../services/cuenta.service';

@Component({
  selector: 'app-desactivar-cuenta',
  templateUrl: './desactivar-cuenta.html',
  styleUrl: './desactivar-cuenta.css',
})
export class DesactivarCuenta {
  private readonly cuentaService = inject(CuentaService);
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly botonAbrir = viewChild<ElementRef<HTMLButtonElement>>('botonAbrir');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  readonly confirmando = signal(false);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly esAnfitrion = computed(() => this.sesion.rol() === 'ANFITRION');

  abrir(): void {
    this.error.set(null);
    this.confirmando.set(true);
    afterNextRender(() => this.panel()?.nativeElement.focus(), { injector: this.injector });
  }

  cancelar(): void {
    if (this.enviando()) {
      return;
    }
    this.confirmando.set(false);
    afterNextRender(() => this.botonAbrir()?.nativeElement.focus(), { injector: this.injector });
  }

  desactivar(): void {
    if (this.enviando()) {
      return;
    }
    this.error.set(null);
    this.enviando.set(true);
    this.cuentaService
      .desactivar()
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          this.sesion.cerrar();
          void this.router.navigate([INICIO_SIN_SESION], {
            queryParams: { aviso: 'cuenta-desactivada' },
          });
        },
        error: (error: unknown) =>
          this.error.set(mensajeDeError(error, 'No pudimos desactivar tu cuenta.')),
      });
  }
}
