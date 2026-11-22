import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Rol } from '../../../config/auth/sesion.models';
import { SesionService } from '../../../config/auth/sesion.service';
import { crearToken } from '../../../config/auth/sesion.testing';
import { environment } from '../../../../environments/environment';
import { moverDias, hoy } from '../../../disponibilidad/utils/fechas';
import { publicacionPublica } from '../../../publicacion/models/catalogo.testing';
import { Cotizador } from './cotizador';

describe('Cotizador (HU-027 y HU-028)', () => {
  let fixture: ComponentFixture<Cotizador>;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/cotizaciones`;
  const llegada = moverDias(hoy(), 10);
  const salida = moverDias(hoy(), 13);
  const datos = publicacionPublica();

  const cotizacion = (cambios: object = {}) => ({
    idCotizacion: 'c-1',
    idPublicacion: 'p-1',
    fechaEntrada: llegada,
    fechaSalida: salida,
    noches: 3,
    cantidadHuespedes: 2,
    precioPorNoche: 180000,
    subtotalAlojamiento: 540000,
    tarifaLimpieza: 30000,
    porcentajeServicio: 10,
    costoServicio: 54000,
    porcentajeDescuento: 0,
    montoDescuento: 0,
    serviciosAdicionales: [],
    costoAdicionalTotal: 0,
    total: 624000,
    ...cambios,
  });

  const disponibilidadLibre = {
    idAlojamiento: 'a-1',
    fechaInicio: hoy(),
    fechaFin: moverDias(hoy(), 366),
    disponible: true,
    cubiertoPorPeriodosDisponibles: true,
    nochesOcupadas: [],
    periodosDisponibles: [{ fechaInicio: hoy(), fechaFin: moverDias(hoy(), 366) }],
  };

  const crear = (
    entradas: Record<string, string> = {},
    rol: Rol | null = null,
    publicacion = datos.publicacion,
  ) => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
      ],
    });
    if (rol) {
      TestBed.inject(SesionService).iniciar(
        crearToken({
          sub: 'hugo@correo.com',
          role: rol,
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      );
    }
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Cotizador);
    fixture.componentRef.setInput('publicacion', publicacion);
    fixture.componentRef.setInput('adicionales', datos.serviciosAdicionales);
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    fixture.detectChanges();
    TestBed.tick();
    backend
      .expectOne((peticion) => peticion.url.endsWith('/alojamientos/a-1/disponibilidad'))
      .flush(disponibilidadLibre);
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const campo = (nombre: string) =>
    elemento().querySelector<HTMLInputElement>(`input[formcontrolname="${nombre}"]`)!;
  const escribir = (nombre: string, valor: string) => {
    campo(nombre).value = valor;
    campo(nombre).dispatchEvent(new Event('input'));
  };
  const enviar = () => {
    elemento().querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
  };
  const responder = async (cuerpo: object, opciones?: { status: number; statusText: string }) => {
    const peticion = backend.expectOne(url);
    peticion.flush(cuerpo, opciones);
    await fixture.whenStable();
    await fixture.whenStable();
    fixture.detectChanges();
    return peticion;
  };

  afterEach(() => backend.verify());

  it('criterio 1: calcula el precio con las fechas y huéspedes elegidos', async () => {
    crear();
    escribir('llegada', llegada);
    escribir('salida', salida);
    escribir('huespedes', '2');
    enviar();

    const peticion = await responder(cotizacion());
    expect(peticion.request.body).toEqual({
      idPublicacion: 'p-1',
      fechaEntrada: llegada,
      fechaSalida: salida,
      cantidadHuespedes: 2,
      idsAdicionales: [],
    });
    const texto = elemento().querySelector('.desglose')?.textContent ?? '';
    expect(texto).toContain('× 3 noches');
    expect(texto).toContain('Tarifa de limpieza');
    expect(texto).toContain('Tarifa de servicio (10 %)');
    expect(elemento().querySelector('.total')?.textContent).toContain('624.000');
  });

  it('criterio 2: incluye los servicios adicionales elegidos en el total', async () => {
    crear({ llegada, salida });
    backend.expectOne(url).flush(cotizacion());
    await fixture.whenStable();

    elemento().querySelector<HTMLInputElement>('.adicional input')!.click();
    fixture.detectChanges();
    // El desglose no desaparece ni hay que volver a calcular: se actualiza solo, y mientras tanto no se puede reservar.
    expect(elemento().querySelector('.desglose')).not.toBeNull();
    expect(elemento().querySelector('.desglose.actualizando')).not.toBeNull();
    expect(elemento().querySelector('button[type="submit"]')).toBeNull();

    const peticion = await responder(
      cotizacion({
        serviciosAdicionales: [
          {
            idAdicional: 'ad-1',
            nombre: 'Desayuno',
            cantidad: 1,
            precioAplicado: 25000,
            subtotal: 25000,
          },
        ],
        costoAdicionalTotal: 25000,
        total: 649000,
      }),
    );
    expect(peticion.request.body.idsAdicionales).toEqual(['ad-1']);
    expect(elemento().querySelector('.desglose')?.textContent).toContain('Desayuno');
    expect(elemento().querySelector('.total')?.textContent).toContain('649.000');
    expect(elemento().querySelector('.desglose.actualizando')).toBeNull();
  });

  it('si falla al actualizar por un servicio adicional, no deja el precio viejo a la vista', async () => {
    crear({ llegada, salida });
    backend.expectOne(url).flush(cotizacion());
    await fixture.whenStable();

    elemento().querySelector<HTMLInputElement>('.adicional input')!.click();
    fixture.detectChanges();
    await responder({ mensaje: 'Falla' }, { status: 500, statusText: 'Error' });

    expect(elemento().querySelector('.desglose')).toBeNull();
    expect(elemento().querySelector('[role="alert"]')).not.toBeNull();
  });

  it('cambiar las fechas sí descarta el precio anterior hasta calcular de nuevo', async () => {
    crear({ llegada, salida });
    backend.expectOne(url).flush(cotizacion());
    await fixture.whenStable();
    fixture.detectChanges();

    escribir('huespedes', '3');
    fixture.detectChanges();

    expect(elemento().querySelector('.desglose')).toBeNull();
    expect(elemento().querySelector('button[type="submit"]')).not.toBeNull();
  });

  it('criterio 3: calcula de una vez con las fechas de la búsqueda', async () => {
    crear({ llegada, salida, huespedes: '9' });
    const peticion = backend.expectOne(url);
    expect(peticion.request.body.cantidadHuespedes).toBe(4);
    peticion.flush(cotizacion());
  });

  it('criterio 4: no cotiza con fechas inválidas ni más huéspedes que la capacidad', () => {
    crear();
    escribir('llegada', salida);
    escribir('salida', llegada);
    escribir('huespedes', '5');
    enviar();

    const texto = elemento().textContent ?? '';
    expect(texto).toContain('La salida debe ser posterior a la llegada.');
    expect(texto).toContain('Indica un número entero de 1 a 4 huéspedes.');
    backend.expectNone(url);
  });

  it('criterio 5: muestra el motivo cuando no hay disponibilidad', async () => {
    crear({ llegada, salida });
    await responder(
      { mensaje: 'El alojamiento no está disponible para las fechas indicadas.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'no está disponible para las fechas indicadas',
    );
  });

  const cotizado = async (rol: Rol | null, publicacion = datos.publicacion) => {
    crear({ llegada, salida }, rol, publicacion);
    await responder(cotizacion());
  };
  const reservar = () => elemento().querySelector<HTMLButtonElement>('.desglose ~ button')!;

  it('HU-029 criterio 1: sin sesión pide iniciar sesión y conserva las fechas', async () => {
    await cotizado(null);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    expect(reservar().textContent?.trim()).toBe('Inicia sesión para reservar');
    reservar().click();

    expect(navegar).toHaveBeenCalledWith(['/usuario/login'], {
      queryParams: {
        volverA: `/publicaciones/p-1?llegada=${llegada}&salida=${salida}&huespedes=1`,
      },
    });
  });

  it('HU-029 criterio 2: un anfitrión no puede reservar', async () => {
    await cotizado('ANFITRION');
    expect(reservar()).toBeNull();
    expect(elemento().textContent).toContain('Para reservar necesitas una cuenta de huésped.');
  });

  it('HU-030: la reserva inmediata aparta las fechas antes de ir a pagar', async () => {
    await cotizado('HUESPED');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(reservar().textContent?.trim()).toBe('Reservar');
    reservar().click();

    const solicitud = backend.expectOne(`${environment.apiUrl}/reservas`);
    expect(solicitud.request.body).toEqual({ idCotizacion: 'c-1' });
    expect(solicitud.request.headers.get('Idempotency-Key')).toBeTruthy();
    solicitud.flush({ idReserva: 'r-1', estado: 'PENDIENTE_PAGO', modoAceptacion: 'INMEDIATA' });
    backend
      .expectOne(`${environment.apiUrl}/reservas/r-1/retencion`)
      .flush({ idReserva: 'r-1', estadoReserva: 'PENDIENTE_PAGO' });

    expect(navegar).toHaveBeenCalledWith(['/reservas', 'r-1'], {
      queryParams: { aviso: 'nueva' },
    });
  });

  it('HU-029 criterio 4: con aprobación envía la solicitud sin apartar fechas', async () => {
    await cotizado('HUESPED', { ...datos.publicacion, modoAceptacion: 'APROBACION' });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(elemento().textContent).toContain('El anfitrión tiene 24 horas');
    reservar().click();

    backend
      .expectOne(`${environment.apiUrl}/reservas`)
      .flush({ idReserva: 'r-2', estado: 'PENDIENTE_APROBACION', modoAceptacion: 'APROBACION' });
    backend.expectNone(`${environment.apiUrl}/reservas/r-2/retencion`);
    expect(navegar).toHaveBeenCalledWith(['/reservas', 'r-2'], {
      queryParams: { aviso: 'nueva' },
    });
  });

  it('HU-029 criterio 5: informa cuando las fechas ya no están disponibles', async () => {
    await cotizado('HUESPED');
    reservar().click();
    backend
      .expectOne(`${environment.apiUrl}/reservas`)
      .flush(
        { mensaje: 'El alojamiento no está disponible para las fechas indicadas.' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('no está disponible');
    expect(reservar().disabled).toBe(false);
  });

  it('no cotiza con un número de huéspedes que no es entero', () => {
    crear({ llegada, salida });
    backend.expectOne(url).flush(cotizacion());
    escribir('huespedes', '1.5');
    enviar();

    expect(elemento().textContent).toContain('Indica un número entero de 1 a 4 huéspedes.');
    backend.expectNone(url);
  });

  it('actualiza el formulario y recalcula cuando cambian las fechas de la búsqueda', async () => {
    crear({ llegada, salida });
    await responder(cotizacion());

    const nuevaSalida = moverDias(salida, 2);
    fixture.componentRef.setInput('salida', nuevaSalida);
    fixture.componentRef.setInput('huespedes', '3');
    fixture.detectChanges();

    const peticion = backend.expectOne(url);
    expect(peticion.request.body.fechaSalida).toBe(nuevaSalida);
    expect(peticion.request.body.cantidadHuespedes).toBe(3);
    expect(campo('salida').value).toBe(nuevaSalida);
    expect(elemento().querySelector('.desglose')).toBeNull();
    peticion.flush(cotizacion({ noches: 5, fechaSalida: nuevaSalida }));
  });

  it('descarta la respuesta de una cotización si el formulario cambió mientras se calculaba', async () => {
    crear({ llegada, salida });
    const pendiente = backend.expectOne(url);

    escribir('salida', moverDias(salida, 1));
    fixture.detectChanges();

    expect(pendiente.cancelled).toBe(true);
    expect(elemento().querySelector('.desglose')).toBeNull();
    expect(elemento().querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(
      false,
    );
  });

  it('completa la reserva pero no lleva a la reserva si el huésped ya salió del cotizador', async () => {
    await cotizado('HUESPED');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    reservar().click();
    fixture.destroy();

    backend
      .expectOne(`${environment.apiUrl}/reservas`)
      .flush({ idReserva: 'r-1', estado: 'PENDIENTE_PAGO', modoAceptacion: 'INMEDIATA' });
    backend
      .expectOne(`${environment.apiUrl}/reservas/r-1/retencion`)
      .flush({ idReserva: 'r-1', estadoReserva: 'PENDIENTE_PAGO' });

    expect(navegar).not.toHaveBeenCalled();
  });

  it('elige las fechas en el calendario y calcula el precio', async () => {
    crear({}, 'HUESPED');
    await fixture.whenStable();
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
    const llegadaCalendario = moverDias(
      `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-01`,
      2,
    );
    const salidaCalendario = moverDias(llegadaCalendario, 3);
    const dia = (valor: string) =>
      [...elemento().querySelectorAll<HTMLButtonElement>('app-selector-fechas button.dia')].find(
        (boton) => boton.textContent?.trim() === String(Number(valor.slice(8))),
      )!;

    elemento()
      .querySelector<HTMLButtonElement>('app-selector-fechas button[aria-label="Mes siguiente"]')!
      .click();
    fixture.detectChanges();
    dia(llegadaCalendario).click();
    fixture.detectChanges();
    expect(campo('llegada').value).toBe(llegadaCalendario);
    expect(campo('salida').value).toBe('');
    backend.expectNone(url);

    dia(salidaCalendario).click();
    fixture.detectChanges();
    expect(campo('salida').value).toBe(salidaCalendario);
    const peticion = await responder(cotizacion());
    expect(peticion.request.body).toEqual(
      expect.objectContaining({ fechaEntrada: llegadaCalendario, fechaSalida: salidaCalendario }),
    );
  });
});
