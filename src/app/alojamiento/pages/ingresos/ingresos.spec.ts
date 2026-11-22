import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { Ingresos } from './ingresos';

describe('Ingresos (página del anfitrión)', () => {
  it('muestra el apartado de ingresos con su título y el desglose abierto', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const backend = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Ingresos);
    fixture.detectChanges();
    TestBed.tick();

    backend.expectOne(`${environment.apiUrl}/anfitrion/ingresos`).flush({
      resumen: {
        pagadoPorHuespedes: 520000,
        devoluciones: 0,
        ingresosNetos: 520000,
        comisionPlataforma: 40000,
        gananciasAnfitriones: 480000,
        reservasConPago: 2,
      },
      publicaciones: [
        {
          idPublicacion: 'p-1',
          titulo: 'Loft',
          reservasConPago: 1,
          pagadoPorHuespedes: 260000,
          devoluciones: 0,
          comisionPlataforma: 20000,
          ganancias: 240000,
        },
        {
          idPublicacion: 'p-2',
          titulo: 'Cabaña',
          reservasConPago: 1,
          pagadoPorHuespedes: 260000,
          devoluciones: 0,
          comisionPlataforma: 20000,
          ganancias: 240000,
        },
      ],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('h1')?.textContent).toBe('Ingresos');
    expect(elemento.querySelectorAll('h2')).toHaveLength(0);
    expect(elemento.querySelector('.principal')?.textContent).toContain('480.000');
    expect(elemento.querySelector('details.desglose')?.hasAttribute('open')).toBe(true);
    backend.verify();
  });
});
