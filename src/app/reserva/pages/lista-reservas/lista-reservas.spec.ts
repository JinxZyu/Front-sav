import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { reservaPropia } from '../../models/reserva.testing';
import { ListaReservas } from './lista-reservas';

describe('ListaReservas del huésped (HU-034)', () => {
  let fixture: ComponentFixture<ListaReservas>;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/reservas/mis-reservas`;

  const crear = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ListaReservas);
    fixture.detectChanges();
    TestBed.tick();
  };

  const responder = async (cuerpo: object, opciones?: { status: number; statusText: string }) => {
    backend.expectOne(url).flush(cuerpo, opciones);
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;

  afterEach(() => backend.verify());

  it('muestra un esqueleto mientras consulta', async () => {
    crear();
    expect(elemento().querySelector('[aria-busy="true"]')).not.toBeNull();
    await responder({ reservas: [], totalResultados: 0, mensaje: null });
  });

  it('criterio 1: lista las reservas con estado, fechas y total', async () => {
    crear();
    await responder({
      reservas: [
        reservaPropia(),
        reservaPropia({ idReserva: 'r-2', alojamiento: 'Cabaña', estado: 'PENDIENTE_APROBACION' }),
        reservaPropia({ idReserva: 'r-3', estado: 'EXPIRADA', fechaSalida: '2026-12-05' }),
      ],
      totalResultados: 3,
      mensaje: null,
    });

    const tarjetas = [...elemento().querySelectorAll<HTMLAnchorElement>('a.tarjeta')];
    expect(tarjetas.map((tarjeta) => tarjeta.getAttribute('href'))).toEqual([
      '/reservas/r-1',
      '/reservas/r-2',
      '/reservas/r-3',
    ]);
    expect(tarjetas[0].textContent).toContain('Pendiente de pago');
    expect(tarjetas[0].textContent).toContain('3 noches');
    expect(tarjetas[0].textContent).toContain('649.000');
    expect(tarjetas[1].textContent).toContain('Esperando aprobación');
    expect(tarjetas[2].textContent).toContain('Vencida');
    expect(tarjetas[2].textContent).toContain('1 noche');
  });

  it('criterio 2: invita a buscar cuando aún no hay reservas', async () => {
    crear();
    await responder({ reservas: [], totalResultados: 0, mensaje: 'No tienes reservas.' });

    expect(elemento().textContent).toContain('Aún no tienes reservas');
    expect(elemento().querySelector('a.boton')?.getAttribute('href')).toBe('/publicaciones');
  });

  it('permite reintentar cuando falla la consulta', async () => {
    crear();
    await responder({}, { status: 500, statusText: 'Error' });
    elemento().querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    TestBed.tick();
    await responder({ reservas: [reservaPropia()], totalResultados: 1, mensaje: null });

    expect(elemento().querySelectorAll('a.tarjeta').length).toBe(1);
  });
});
