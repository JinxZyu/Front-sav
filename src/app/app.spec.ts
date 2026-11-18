import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('muestra el logo y las opciones de navegación', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;
    const texto = elemento.textContent ?? '';

    expect((elemento.querySelector('.marca img') as HTMLImageElement).alt).toBe('SAV');
    expect(texto).toContain('Alojamientos');
    expect(texto).toContain('Iniciar sesión');
    expect(texto).toContain('Registrarse');
  });
});
