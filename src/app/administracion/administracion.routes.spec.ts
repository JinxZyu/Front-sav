import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ADMINISTRACION_ROUTES } from './administracion.routes';

describe('rutas de administración', () => {
  it('la entrada lleva a usuarios dentro del panel con sus secciones', async () => {
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
      peticion.url.endsWith('/administracion/usuarios'),
    );

    expect(TestBed.inject(Router).url).toBe('/administracion/usuarios');
    const elemento = harness.routeNativeElement as HTMLElement;
    const actual = elemento.querySelector('nav a[aria-current="page"]') as HTMLAnchorElement;
    expect(actual.textContent?.trim()).toBe('Usuarios');
    expect(actual.getAttribute('href')).toBe('/administracion/usuarios');
    expect(elemento.querySelector('app-gestion-usuarios')).not.toBeNull();
  });
});
