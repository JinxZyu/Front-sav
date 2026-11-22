import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { IngresosAnfitrion } from '../../models/ingresos-anfitrion.models';
import { ResumenIngresos } from './resumen-ingresos';

describe('ResumenIngresos', () => {
  let fixture: ComponentFixture<ResumenIngresos>;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/anfitrion/ingresos`;

  const ingresos = (cambios: Partial<IngresosAnfitrion> = {}): IngresosAnfitrion => ({
    resumen: {
      pagadoPorHuespedes: 520000,
      devoluciones: 130000,
      ingresosNetos: 390000,
      comisionPlataforma: 15000,
      gananciasAnfitriones: 375000,
      reservasConPago: 2,
    },
    publicaciones: [
      {
        idPublicacion: 'p-1',
        titulo: 'Loft en el centro',
        reservasConPago: 1,
        pagadoPorHuespedes: 260000,
        devoluciones: 0,
        comisionPlataforma: 10000,
        ganancias: 250000,
      },
      {
        idPublicacion: 'p-2',
        titulo: 'Cabaña frente al lago',
        reservasConPago: 1,
        pagadoPorHuespedes: 260000,
        devoluciones: 130000,
        comisionPlataforma: 5000,
        ganancias: 125000,
      },
    ],
    ...cambios,
  });

  const crear = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ResumenIngresos);
    fixture.detectChanges();
    TestBed.tick();
  };

  const responder = async (cuerpo: object, opciones?: { status: number; statusText: string }) => {
    backend.expectOne(url).flush(cuerpo, opciones);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const texto = (selector: string) =>
    elemento().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  // Une el texto de cada parte (etiqueta, cifra, detalle) con un espacio, como se lee en pantalla.
  const unir = (nodo: Element | null) =>
    [...(nodo?.querySelectorAll('span') ?? [])]
      .map((parte) => parte.textContent?.replace(/\s+/g, ' ').trim())
      .join(' ');

  afterEach(() => backend.verify());

  it('no muestra nada mientras carga', () => {
    crear();
    expect(elemento().querySelector('.cifras')).toBeNull();
    backend.expectOne(url).flush(ingresos());
  });

  it('muestra las ganancias del anfitrión y de dónde salen', async () => {
    crear();
    await responder(ingresos());

    expect(unir(elemento().querySelector('.principal'))).toBe('Tus ganancias $ 375.000 2 reservas pagadas');
    const rotulos = [...elemento().querySelectorAll('.cifras li')].map((nodo) => unir(nodo));
    expect(rotulos).toContain('Pagado por huéspedes $ 520.000');
    expect(rotulos).toContain('Devoluciones por cancelaciones $ 130.000');
    expect(rotulos).toContain('Comisión de la plataforma $ 15.000');
    expect(elemento().textContent).toContain('después de la comisión de la plataforma');
  });

  it('con una sola reserva lo dice en singular', async () => {
    crear();
    await responder(
      ingresos({
        resumen: {
          pagadoPorHuespedes: 220000,
          devoluciones: 0,
          ingresosNetos: 220000,
          comisionPlataforma: 20000,
          gananciasAnfitriones: 200000,
          reservasConPago: 1,
        },
      }),
    );

    expect(unir(elemento().querySelector('.principal'))).toContain('1 reserva pagada');
  });

  it('desglosa por alojamiento cuando hay más de uno', async () => {
    crear();
    await responder(ingresos());

    expect(texto('.desglose summary')).toBe('Ver por alojamiento');
    const filas = [...elemento().querySelectorAll('.desglose li')].map((nodo) => unir(nodo));
    expect(filas).toEqual([
      'Loft en el centro $ 250.000 1 reserva',
      'Cabaña frente al lago $ 125.000 1 reserva',
    ]);
  });

  it('con un solo alojamiento no repite el desglose', async () => {
    crear();
    await responder(ingresos({ publicaciones: [ingresos().publicaciones[0]] }));

    expect(elemento().querySelector('.desglose')).toBeNull();
  });

  it('sin reservas pagadas explica cuándo aparecerán las ganancias', async () => {
    crear();
    await responder(
      ingresos({
        resumen: {
          pagadoPorHuespedes: 0,
          devoluciones: 0,
          ingresosNetos: 0,
          comisionPlataforma: 0,
          gananciasAnfitriones: 0,
          reservasConPago: 0,
        },
        publicaciones: [],
      }),
    );

    expect(elemento().querySelector('.cifras')).toBeNull();
    expect(elemento().textContent).toContain('Aún no tienes reservas pagadas');
  });

  it('si falla la consulta lo avisa y permite reintentar', async () => {
    crear();
    await responder({ mensaje: 'Error' }, { status: 500, statusText: 'Error' });

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos consultar tus ingresos',
    );
    elemento().querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    fixture.detectChanges();
    TestBed.tick();
    await responder(ingresos());

    expect(elemento().querySelector('[role="alert"]')).toBeNull();
    expect(elemento().querySelector('.principal')).not.toBeNull();
  });
});
