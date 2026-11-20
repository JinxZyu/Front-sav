import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { reservaDeAlojamiento } from '../../models/reserva.testing';
import { DetalleSolicitud } from './detalle-solicitud';

describe('DetalleSolicitud del anfitrión (HU-032 y HU-035)', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/reservas`;
  const consulta = `${api}/mis-alojamientos/r-1`;

  const abrir = async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'reservas/alojamientos/:idReserva', component: DetalleSolicitud }]),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create('/reservas/alojamientos/r-1');
  };

  const responder = async (url: string, cuerpo: object, estado?: number) => {
    backend
      .expectOne(url)
      .flush(cuerpo, estado ? { status: estado, statusText: 'Error' } : undefined);
    await new Promise((resolver) => setTimeout(resolver));
    harness.detectChanges();
  };

  const elemento = () => harness.routeNativeElement as HTMLElement;
  const boton = (texto: string) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('button')].find((actual) =>
      actual.textContent?.trim().startsWith(texto),
    );
  const aviso = () => elemento().querySelector('.aviso')?.textContent?.trim();

  afterEach(() => backend.verify());

  it('muestra la solicitud con el huésped, las fechas y el total', async () => {
    await abrir();
    await responder(consulta, reservaDeAlojamiento());

    expect(elemento().querySelector('h1')?.textContent).toContain('Cabaña frente al embalse');
    expect(elemento().querySelector('dl')?.textContent).toContain('Hugo Pérez');
    expect(elemento().querySelector('dl')?.textContent).toContain('820.000');
    expect(elemento().querySelector('dl')?.textContent).toContain('Responde antes del');
    expect(elemento().textContent).toContain('Este huésped espera tu respuesta');
  });

  it('HU-032: aprueba la solicitud y deja al huésped pendiente de pago', async () => {
    await abrir();
    await responder(consulta, reservaDeAlojamiento());

    boton('Aprobar solicitud')!.click();
    const peticion = backend.expectOne(`${api}/r-1/aprobar`);
    expect(peticion.request.method).toBe('PATCH');
    peticion.flush({ estado: 'PENDIENTE_PAGO', mensaje: 'Solicitud aprobada.' });
    await new Promise((resolver) => setTimeout(resolver));
    await responder(consulta, reservaDeAlojamiento({ estado: 'PENDIENTE_PAGO' }));

    expect(aviso()).toBe('Solicitud aprobada.');
    expect(elemento().textContent).toContain('Pendiente de pago');
    expect(boton('Aprobar solicitud')).toBeUndefined();
  });

  it('HU-035: pide confirmar antes de rechazar', async () => {
    await abrir();
    await responder(consulta, reservaDeAlojamiento());

    boton('Rechazar')!.click();
    harness.detectChanges();
    expect(elemento().textContent).toContain('¿Seguro que quieres rechazarla?');
    boton('No, volver')!.click();
    harness.detectChanges();
    expect(boton('Aprobar solicitud')).toBeDefined();

    boton('Rechazar')!.click();
    harness.detectChanges();
    boton('Sí, rechazar')!.click();
    backend
      .expectOne(`${api}/r-1/rechazar`)
      .flush({ estado: 'RECHAZADA', mensaje: 'Solicitud rechazada.' });
    await new Promise((resolver) => setTimeout(resolver));
    await responder(consulta, reservaDeAlojamiento({ estado: 'RECHAZADA' }));

    expect(aviso()).toBe('Solicitud rechazada.');
    expect(elemento().textContent).toContain('las fechas quedaron libres');
  });

  it('informa si la solicitud ya había sido resuelta', async () => {
    await abrir();
    await responder(consulta, reservaDeAlojamiento());

    boton('Aprobar solicitud')!.click();
    await responder(
      `${api}/r-1/aprobar`,
      { mensaje: 'La solicitud ya fue resuelta o no admite una decisión.' },
      409,
    );
    await responder(consulta, reservaDeAlojamiento({ estado: 'RECHAZADA' }));

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('ya fue resuelta');
  });

  it('informa cuando la reserva no es de sus alojamientos', async () => {
    await abrir();
    await responder(consulta, { mensaje: 'No autorizado.' }, 403);
    expect(elemento().querySelector('h1')?.textContent).toContain('No encontramos esta reserva');
  });

  it('reinicia la confirmación y descarta la decisión al cambiar de reserva', async () => {
    await abrir();
    await responder(consulta, reservaDeAlojamiento());
    boton('Rechazar')!.click();
    harness.detectChanges();
    boton('Sí, rechazar')!.click();
    const decision = backend.expectOne(`${api}/r-1/rechazar`);

    await harness.navigateByUrl('/reservas/alojamientos/r-2');
    await responder(`${api}/mis-alojamientos/r-2`, reservaDeAlojamiento({ idReserva: 'r-2' }));

    expect(decision.cancelled).toBe(true);
    expect(aviso()).toBeUndefined();
    expect(elemento().textContent).not.toContain('¿Seguro que quieres rechazarla?');
    expect(boton('Aprobar solicitud')?.disabled).toBe(false);
  });

  it('mantiene bloqueadas las decisiones mientras se recarga la solicitud', async () => {
    await abrir();
    await responder(consulta, reservaDeAlojamiento());

    boton('Aprobar solicitud')!.click();
    backend
      .expectOne(`${api}/r-1/aprobar`)
      .flush({ estado: 'PENDIENTE_PAGO', mensaje: 'Solicitud aprobada.' });
    await new Promise((resolver) => setTimeout(resolver));
    harness.detectChanges();

    const aprobando = boton('Aprobando')!;
    expect(aprobando.disabled).toBe(true);
    aprobando.click();
    backend.expectNone(`${api}/r-1/aprobar`);
    await responder(consulta, reservaDeAlojamiento({ estado: 'PENDIENTE_PAGO' }));
    expect(boton('Aprobar solicitud')).toBeUndefined();
  });
});
