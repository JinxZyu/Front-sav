import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ADMINISTRACION_ROUTES } from './administracion.routes';

describe('rutas de administración', () => {
  it('la entrada lleva a los indicadores dentro del panel con sus secciones', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'administracion', children: ADMINISTRACION_ROUTES }]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/administracion');
    TestBed.inject(HttpTestingController).expectOne((peticion) =>
      peticion.url.endsWith('/administracion/dashboard/indicadores'),
    );

    expect(TestBed.inject(Router).url).toBe('/administracion/indicadores');
    const elemento = harness.routeNativeElement as HTMLElement;
    const actual = elemento.querySelector('nav a[aria-current="page"]') as HTMLAnchorElement;
    expect(actual.textContent?.trim()).toBe('Indicadores');
    expect(actual.getAttribute('href')).toBe('/administracion/indicadores');
    expect(elemento.querySelector('app-panel-indicadores')).not.toBeNull();
    expect(
      [...elemento.querySelectorAll('nav a')].map((enlace) => enlace.getAttribute('href')),
    ).toEqual([
      '/administracion/indicadores',
      '/administracion/usuarios',
      '/administracion/publicaciones',
      '/administracion/tarifas',
    ]);
  });

  it('cada sección carga su página', async () => {
    const panel = ADMINISTRACION_ROUTES[0];
    for (const ruta of panel.children ?? []) {
      if (ruta.loadComponent) {
        expect(await ruta.loadComponent()).toBeDefined();
      }
    }
  });
});
