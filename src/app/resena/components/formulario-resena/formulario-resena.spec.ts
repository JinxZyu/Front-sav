import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ResenaCreada } from '../../models/resena.models';
import { FormularioResena } from './formulario-resena';

describe('FormularioResena (HU-040)', () => {
  let fixture: ComponentFixture<FormularioResena>;
  let backend: HttpTestingController;
  let creadas: ResenaCreada[];
  const url = `${environment.apiUrl}/reservas/r-1/resenas`;

  const crear = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FormularioResena);
    fixture.componentRef.setInput('idReserva', 'r-1');
    creadas = [];
    fixture.componentInstance.creada.subscribe((resena) => creadas.push(resena));
    fixture.detectChanges();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const estrella = (valor: number) =>
    elemento().querySelectorAll<HTMLInputElement>('input[type="radio"]')[valor - 1];
  const escribir = (texto: string) => {
    const comentario = elemento().querySelector<HTMLTextAreaElement>('textarea')!;
    comentario.value = texto;
    comentario.dispatchEvent(new Event('input'));
  };
  const enviar = () => {
    elemento().querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
  };

  afterEach(() => backend.verify());

  it('criterio 1: publica la calificación y el comentario', async () => {
    crear();
    estrella(4).click();
    escribir('  Muy buena estadía.  ');
    fixture.detectChanges();
    expect(elemento().querySelectorAll('label.llena').length).toBe(4);
    enviar();

    const peticion = backend.expectOne(url);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ calificacion: 4, comentario: 'Muy buena estadía.' });
    peticion.flush({ idResena: 'e-1', idReserva: 'r-1', calificacion: 4, mensaje: 'Listo.' });
    await fixture.whenStable();

    expect(creadas.length).toBe(1);
  });

  it('pide la calificación y un comentario con texto', () => {
    crear();
    escribir('   ');
    enviar();

    expect(elemento().textContent).toContain('Elige de 1 a 5 estrellas.');
    expect(elemento().textContent).toContain('Escribe un comentario sobre tu estadía.');
    backend.expectNone(url);
  });

  it('criterio 4: informa si la reserva ya tiene una reseña', async () => {
    crear();
    estrella(5).click();
    escribir('Excelente.');
    enviar();
    backend
      .expectOne(url)
      .flush(
        { mensaje: 'Esta reserva ya tiene una reseña registrada.' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'ya tiene una reseña registrada',
    );
    expect(creadas.length).toBe(0);
  });
});
