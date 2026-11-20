import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { reservaPropia } from '../../models/reserva.testing';
import { DetalleReserva } from './detalle-reserva';

describe('DetalleReserva del huésped', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/reservas`;
  const consulta = `${api}/mis-reservas/r-1`;
  const enDiezMinutos = () => new Date(Date.now() + 600_000).toISOString();

  const abrir = async (url = '/reservas/r-1') => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'reservas/:idReserva', component: DetalleReserva }]),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create(url);
  };

  const refrescar = async () => {
    await new Promise((resolver) => setTimeout(resolver));
    harness.detectChanges();
  };

  const responder = async (url: string, cuerpo: object | null, estado?: number) => {
    backend
      .expectOne(url)
      .flush(cuerpo, estado ? { status: estado, statusText: 'Error' } : undefined);
    await refrescar();
  };

  const elemento = () => harness.routeNativeElement as HTMLElement;
  const boton = (texto: string) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('button')].find((actual) =>
      actual.textContent?.trim().startsWith(texto),
    );
  const aviso = () => elemento().querySelector('.aviso')?.textContent?.trim();

  afterEach(() => backend.verify());

  it('HU-034: muestra el resumen de la reserva', async () => {
    await abrir();
    await responder(
      consulta,
      reservaPropia({ estado: 'PENDIENTE_APROBACION', retencionHasta: enDiezMinutos() }),
    );

    expect(elemento().querySelector('h1')?.textContent).toContain('Loft en Chapinero');
    expect(elemento().textContent).toContain('Esperando aprobación');
    expect(elemento().textContent).toContain('El anfitrión está revisando tu solicitud');
    expect(elemento().querySelector('dl')?.textContent).toContain('649.000');
    expect(elemento().querySelector('dl')?.textContent).toContain('3');
    expect(aviso()).toBeUndefined();
    expect(boton('Pagar')).toBeUndefined();
  });

  it('HU-029: avisa cuando la reserva se acaba de crear', async () => {
    await abrir('/reservas/r-1?aviso=nueva');
    await responder(consulta, reservaPropia({ estado: 'PENDIENTE_APROBACION' }));
    expect(aviso()).toBe('Enviamos tu solicitud al anfitrión.');
  });

  it('HU-029: avisa la reserva inmediata recién creada', async () => {
    await abrir('/reservas/r-1?aviso=nueva');
    await responder(consulta, reservaPropia());
    expect(aviso()).toBe('Creamos tu reserva.');
  });

  it('HU-030: muestra el plazo restante mientras las fechas están apartadas', async () => {
    await abrir();
    await responder(consulta, reservaPropia({ retencionHasta: enDiezMinutos() }));
    expect(elemento().textContent).toContain('Tus fechas están apartadas hasta');
    expect(elemento().textContent?.replace(/\s+/g, ' ')).toMatch(
      /te quedan 1[01] minutos para pagar/,
    );
    expect(boton('Apartar fechas')).toBeUndefined();
  });

  it('HU-034: informa cuando la reserva no existe', async () => {
    await abrir();
    await responder(consulta, { mensaje: 'La reserva no existe.' }, 404);
    expect(elemento().textContent).toContain('No encontramos esta reserva');
  });

  it('HU-036 criterio 1: paga mientras las fechas están apartadas', async () => {
    await abrir();
    await responder(consulta, reservaPropia({ retencionHasta: enDiezMinutos() }));
    expect(elemento().textContent).toContain('Tus fechas están apartadas hasta');

    boton('Pagar $')!.click();
    const pago = backend.expectOne(`${api}/r-1/pago-simulado`);
    expect(pago.request.headers.get('Idempotency-Key')).toBeTruthy();
    pago.flush({ estadoReserva: 'CONFIRMADA', estadoPago: 'PAGADO' });
    await refrescar();
    await responder(consulta, reservaPropia({ estado: 'CONFIRMADA' }));

    expect(aviso()).toBe('¡Pago aprobado! Tu reserva está confirmada.');
    expect(elemento().textContent).toContain('Confirmada');
    expect(boton('Pagar')).toBeUndefined();
  });

  it('HU-036 criterio 2: si el pago queda en proceso permite consultarlo de nuevo', async () => {
    await abrir();
    await responder(consulta, reservaPropia({ retencionHasta: enDiezMinutos() }));

    boton('Pagar $')!.click();
    backend
      .expectOne(`${api}/r-1/pago-simulado`)
      .flush({ estadoReserva: 'PENDIENTE_PAGO', estadoPago: 'PENDIENTE' });
    await refrescar();
    await responder(consulta, reservaPropia({ retencionHasta: enDiezMinutos() }));

    expect(aviso()).toContain('Estamos confirmando tu pago');
    expect(boton('Consultar estado del pago')).toBeDefined();
  });

  it('HU-036 criterio 3: informa un pago rechazado o un plazo vencido', async () => {
    await abrir();
    await responder(consulta, reservaPropia({ retencionHasta: enDiezMinutos() }));

    boton('Pagar $')!.click();
    await responder(`${api}/r-1/pago-simulado`, { mensaje: 'El plazo de pago venció.' }, 410);
    await responder(consulta, reservaPropia({ estado: 'EXPIRADA' }));

    expect(aviso()).toBe('El plazo de pago venció.');
    expect(elemento().textContent).toContain('El plazo para pagar venció');
  });

  it('HU-030: aparta de nuevo las fechas cuando la retención venció', async () => {
    await abrir();
    await responder(consulta, reservaPropia({ retencionHasta: null }));

    boton('Apartar fechas')!.click();
    await responder(`${api}/r-1/retencion`, { retencionHasta: enDiezMinutos() });
    await responder(consulta, reservaPropia({ retencionHasta: enDiezMinutos() }));

    expect(aviso()).toContain('Apartamos de nuevo tus fechas');
    expect(boton('Apartar fechas')).toBeUndefined();
    expect(boton('Pagar $')).toBeDefined();
  });
});
