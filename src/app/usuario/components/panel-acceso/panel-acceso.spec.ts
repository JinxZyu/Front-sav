import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { PanelAcceso } from './panel-acceso';

@Component({ template: '' })
class PaginaVacia {}

describe('PanelAcceso', () => {
  let router: Router;

  const abrir = async (url: string) => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: PaginaVacia }])],
    });
    router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    const fixture = TestBed.createComponent(PanelAcceso);
    await fixture.whenStable();
    return fixture;
  };

  const elemento = (fixture: { nativeElement: HTMLElement }, selector: string) =>
    fixture.nativeElement.querySelector(selector);

  it('en el registro marca la pestaña de crear cuenta', async () => {
    const fixture = await abrir('/usuario/registro');

    expect(fixture.componentInstance.modo()).toBe('registro');
    expect(elemento(fixture, '.pestanas.en-registro')).not.toBeNull();
    expect(elemento(fixture, 'a.activa')?.textContent).toContain('Crear cuenta');
  });

  it('en el login marca la pestaña de iniciar sesión', async () => {
    const fixture = await abrir('/usuario/login');

    expect(fixture.componentInstance.modo()).toBe('login');
    expect(elemento(fixture, '.pestanas.en-registro')).toBeNull();
    expect(elemento(fixture, 'a.activa')?.textContent).toContain('Iniciar sesión');
  });

  it('en la verificación oculta las pestañas', async () => {
    const fixture = await abrir('/usuario/verificar-correo?correo=a@b.co');

    expect(fixture.componentInstance.modo()).toBe('verificar');
    expect(elemento(fixture, '.pestanas')).toBeNull();
  });

  it('mueve el indicador al navegar entre pantallas', async () => {
    const fixture = await abrir('/usuario/registro');

    await router.navigateByUrl('/usuario/login');
    await fixture.whenStable();

    expect(fixture.componentInstance.modo()).toBe('login');
    expect(elemento(fixture, '.pestanas.en-registro')).toBeNull();
  });

  it('en la recuperación de contraseña oculta las pestañas', async () => {
    const fixture = await abrir('/usuario/recuperar-contrasena');

    expect(fixture.componentInstance.modo()).toBe('recuperar');
    expect(elemento(fixture, '.pestanas')).toBeNull();
  });
});
