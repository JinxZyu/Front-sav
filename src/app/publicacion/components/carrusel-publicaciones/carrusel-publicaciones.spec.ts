import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ResumenPublicacion } from '../../../alojamiento/models/alojamiento.models';
import { CarruselPublicaciones } from './carrusel-publicaciones';

describe('CarruselPublicaciones', () => {
  let fixture: ComponentFixture<CarruselPublicaciones>;

  const resumen = (id: string): ResumenPublicacion => ({
    idPublicacion: id,
    idAlojamiento: `a-${id}`,
    titulo: `Alojamiento ${id}`,
    ciudad: 'Bogotá',
    tipoAlojamiento: 'Casa',
    capacidad: 2,
    precioPorNoche: 100000,
    estado: 'ACTIVA',
    fechaCreacion: '2026-11-18T10:00:00-05:00',
  });

  const crear = (verTodos: Record<string, string> | null = null) => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(CarruselPublicaciones);
    fixture.componentRef.setInput('titulo', 'Alojamientos en Bogotá');
    fixture.componentRef.setInput('publicaciones', [resumen('p-1'), resumen('p-2')]);
    fixture.componentRef.setInput('verTodos', verTodos);
    fixture.detectChanges();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;

  it('muestra el título, las tarjetas y el enlace para ver todos', () => {
    crear({ ciudad: 'Bogotá' });

    expect(elemento().querySelector('h2')?.textContent?.trim()).toBe('Alojamientos en Bogotá');
    expect(elemento().querySelector('h2 a')?.getAttribute('href')).toBe(
      '/publicaciones?ciudad=Bogot%C3%A1',
    );
    expect(elemento().querySelectorAll('a.tarjeta')).toHaveLength(2);
    expect(
      elemento().querySelector('button[aria-label="Ver anteriores"]')?.hasAttribute('disabled'),
    ).toBe(true);
  });

  it('sin enlace muestra solo el título y las flechas desplazan la pista', () => {
    crear();
    const pista = elemento().querySelector('.pista') as HTMLElement;
    const desplazar = vi.fn();
    pista.scrollBy = desplazar as unknown as typeof pista.scrollBy;
    Object.defineProperty(pista, 'clientWidth', { value: 500 });

    expect(elemento().querySelector('h2 a')).toBeNull();
    (elemento().querySelector('button[aria-label="Ver siguientes"]') as HTMLButtonElement).click();

    expect(desplazar).toHaveBeenCalledWith({ left: 450, behavior: 'smooth' });
  });

  it('activa o desactiva las flechas según la posición', () => {
    crear();
    const pista = elemento().querySelector('.pista') as HTMLElement;
    Object.defineProperty(pista, 'clientWidth', { value: 500 });
    Object.defineProperty(pista, 'scrollWidth', { value: 1000 });
    pista.scrollLeft = 500;
    pista.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    const anterior = elemento().querySelector('button[aria-label="Ver anteriores"]');
    const siguiente = elemento().querySelector('button[aria-label="Ver siguientes"]');
    expect(anterior?.hasAttribute('disabled')).toBe(false);
    expect(siguiente?.hasAttribute('disabled')).toBe(true);
  });

  it('recalcula las flechas cuando cambia el ancho de la pista', async () => {
    let avisar: () => void = () => undefined;
    const observar = vi.fn();
    const desconectar = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(llamada: () => void) {
          avisar = llamada;
        }
        observe = observar;
        disconnect = desconectar;
      },
    );
    try {
      crear();
      await fixture.whenStable();
      const pista = elemento().querySelector('.pista') as HTMLElement;
      expect(observar).toHaveBeenCalledWith(pista);

      Object.defineProperty(pista, 'clientWidth', { value: 500, configurable: true });
      Object.defineProperty(pista, 'scrollWidth', { value: 1000 });
      avisar();
      fixture.detectChanges();
      const siguiente = () => elemento().querySelector('button[aria-label="Ver siguientes"]');
      expect(siguiente()?.hasAttribute('disabled')).toBe(false);

      Object.defineProperty(pista, 'clientWidth', { value: 1000 });
      avisar();
      fixture.detectChanges();
      expect(siguiente()?.hasAttribute('disabled')).toBe(true);

      fixture.destroy();
      expect(desconectar).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
