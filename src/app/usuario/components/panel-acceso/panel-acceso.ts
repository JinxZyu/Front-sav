import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

export type ModoAcceso = 'registro' | 'login' | 'verificar';

@Component({
  selector: 'app-panel-acceso',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './panel-acceso.html',
  styleUrl: './panel-acceso.css',
})
export class PanelAcceso {
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly modo = computed<ModoAcceso>(() => {
    const url = this.url();
    if (url.includes('/login')) {
      return 'login';
    }
    if (url.includes('/verificar-correo')) {
      return 'verificar';
    }
    return 'registro';
  });
}
