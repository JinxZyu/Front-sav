import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ResenasPublicacion } from './resenas-publicacion';

describe('ResenasPublicacion (HU-041)', () => {
  let fixture: ComponentFixture<ResenasPublicacion>;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/publicaciones/p-1/resenas`;

  const crear = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ResenasPublicacion);
    fixture.componentRef.setInput('idPublicacion', 'p-1');
    fixture.detectChanges();
    TestBed.tick();
  };

  const responder = async (cuerpo: object, opciones?: { status: number; statusText: string }) => {
    backend.expectOne(url).flush(cuerpo, opciones);
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;

  afterEach(() => backend.verify());

  it('criterio 1: muestra el promedio y las reseñas visibles', async () => {
    crear();
    await responder({
      idPublicacion: 'p-1',
      resenas: [
        {
          idResena: 'e-1',
          calificacion: 5,
          comentario: 'Excelente vista.',
          fechaPublicacion: '2026-11-10T12:00:00Z',
        },
        {
          idResena: 'e-2',
          calificacion: 4,
          comentario: 'Muy cómodo.',
          fechaPublicacion: '2026-11-08T12:00:00Z',
        },
      ],
      totalResenas: 2,
      calificacionPromedio: 4.5,
      mensaje: null,
    });

    expect(elemento().querySelector('.resumen')?.textContent).toContain('4,5');
    expect(elemento().querySelector('.resumen')?.textContent).toContain('2 reseñas');
    expect(elemento().querySelector('.resumen app-estrellas')?.getAttribute('aria-label')).toBe(
      '4,5 de 5 estrellas',
    );
    const resenas = [...elemento().querySelectorAll('.lista li')];
    expect(resenas.length).toBe(2);
    expect(resenas[0].textContent).toContain('Excelente vista.');
    expect(resenas[0].querySelectorAll('svg.llena').length).toBe(5);
    expect(resenas[1].querySelectorAll('svg.llena').length).toBe(4);
  });

  it('criterio 2: informa cuando no hay reseñas', async () => {
    crear();
    await responder({
      idPublicacion: 'p-1',
      resenas: [],
      totalResenas: 0,
      calificacionPromedio: 0,
      mensaje: 'Esta publicación aún no tiene reseñas visibles.',
    });

    expect(elemento().textContent).toContain('Este alojamiento aún no tiene reseñas.');
  });

  it('permite reintentar si falla la consulta', async () => {
    crear();
    await responder(
      { mensaje: 'La publicación no existe.' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'La publicación no existe.',
    );
    elemento().querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    TestBed.tick();
    await responder({
      idPublicacion: 'p-1',
      resenas: [],
      totalResenas: 0,
      calificacionPromedio: 0,
      mensaje: null,
    });
    expect(elemento().querySelector('[role="alert"]')).toBeNull();
  });
});
