import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AUDITOR_ROUTES } from './auditor.routes';

describe('rutas del auditor de operación', () => {
  it('entra a los indicadores y solo ofrece secciones de consulta', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'auditoria', children: AUDITOR_ROUTES }]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/auditoria');
    TestBed.inject(HttpTestingController).expectOne((peticion) =>
      peticion.url.endsWith('/administracion/dashboard/indicadores'),
    );

    expect(TestBed.inject(Router).url).toBe('/auditoria/indicadores');
    const elemento = harness.routeNativeElement as HTMLElement;
    const navegacion = elemento.querySelector('nav') as HTMLElement;
    expect(navegacion.getAttribute('aria-label')).toBe('Secciones de auditoría');
    expect(
      [...navegacion.querySelectorAll('a')].map((enlace) => [
        enlace.textContent?.trim(),
        enlace.getAttribute('href'),
      ]),
    ).toEqual([
      ['Indicadores', '/auditoria/indicadores'],
      ['Eventos', '/auditoria/eventos'],
    ]);
    expect(elemento.querySelector('app-panel-indicadores')).not.toBeNull();
  });

  it('cada sección carga su página', async () => {
    for (const ruta of AUDITOR_ROUTES[0].children ?? []) {
      if (ruta.loadComponent) {
        expect(await ruta.loadComponent()).toBeDefined();
      }
    }
  });
});
