import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { reservaAfectada } from '../../models/publicacion-administrada.testing';
import { ReservasAfectadas } from './reservas-afectadas';

describe('ReservasAfectadas (HU-018)', () => {
  let fixture: ComponentFixture<ReservasAfectadas>;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/administracion/publicaciones/p-1/reservas-afectadas`;

  const crear = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReservasAfectadas);
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

  it('avisa mientras consulta', async () => {
    crear();
    expect(elemento().querySelector('[aria-busy="true"]')?.textContent).toContain(
      'Consultando reservas',
    );
    await responder({ mensaje: '', reservas: [] });
  });

  it('criterio 1: muestra las reservas futuras con huésped, fechas, estado y motivo', async () => {
    crear();
    await responder({
      mensaje: 'Reservas futuras afectadas consultadas correctamente.',
      reservas: [
        reservaAfectada({
          idReserva: 'r-2',
          nombreHuesped: 'Laura Mejía',
          fechaEntrada: '2027-01-10',
          fechaSalida: '2027-01-11',
          estadoReserva: 'PENDIENTE_APROBACION',
        }),
        reservaAfectada(),
      ],
    });

    const filas = [...elemento().querySelectorAll('li')];
    expect(filas.map((fila) => fila.querySelector('.huesped')?.textContent?.trim())).toEqual([
      'Hugo Díaz',
      'Laura Mejía',
    ]);
    expect(filas[0].textContent).toContain('3 noches');
    expect(filas[0].querySelector('app-estado-reserva')?.textContent).toContain('Confirmada');
    expect(filas[1].textContent).toContain('1 noche');
    expect(elemento().querySelector('.motivo')?.textContent).toContain('Información engañosa');
  });

  it('criterio 2: avisa cuando no hay reservas futuras afectadas', async () => {
    crear();
    await responder({
      mensaje: 'No existen reservas futuras afectadas por el bloqueo.',
      reservas: [],
    });

    expect(elemento().textContent).toContain('No hay reservas futuras afectadas por el bloqueo.');
    expect(elemento().querySelector('.motivo')).toBeNull();
  });

  it('si falla la consulta permite reintentar', async () => {
    crear();
    await responder(
      { mensaje: 'Solamente puedes consultar reservas afectadas de publicaciones BLOQUEADAS.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'Solamente puedes consultar reservas afectadas de publicaciones BLOQUEADAS.',
    );
    (elemento().querySelector('button.enlace') as HTMLButtonElement).click();
    fixture.detectChanges();
    await responder({ mensaje: '', reservas: [reservaAfectada()] });
    expect(elemento().querySelectorAll('li')).toHaveLength(1);
  });
});
