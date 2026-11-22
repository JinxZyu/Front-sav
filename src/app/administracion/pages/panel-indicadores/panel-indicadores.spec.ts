import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { crearToken } from '../../../config/auth/sesion.testing';
import { indicadores } from '../../models/indicadores.testing';
import { PanelIndicadores } from './panel-indicadores';

describe('PanelIndicadores (HU-043)', () => {
  let fixture: ComponentFixture<PanelIndicadores>;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/administracion/dashboard/indicadores`;

  const crear = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PanelIndicadores);
    fixture.detectChanges();
    TestBed.tick();
  };

  const responder = async (cuerpo: object, opciones?: { status: number; statusText: string }) => {
    backend.expectOne(url).flush(cuerpo, opciones);
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const texto = (nodo: Element | null) => (nodo?.textContent ?? '').replaceAll(/\s+/g, ' ').trim();
  // El detalle de usuarios va en una línea por dato; aquí se junta con " / " para compararlo fácil.
  const detalle = (cifra: Element) => {
    const lineas = [...cifra.querySelectorAll('.detalle > span')].map((linea) => texto(linea));
    return lineas.length > 0 ? lineas.join(' / ') : texto(cifra.querySelector('.detalle'));
  };
  const cifras = () =>
    [...elemento().querySelectorAll('.cifras li')].map(
      (cifra) =>
        `${texto(cifra.querySelector('.nombre'))}|${texto(cifra.querySelector('.cifra'))}|${detalle(cifra)}`,
    );
  const seccion = (id: string) =>
    elemento().querySelector(`section[aria-labelledby="${id}"]`) as HTMLElement;
  const filas = (id: string) =>
    [...seccion(id).querySelectorAll('li')].map(
      (fila) =>
        `${fila.querySelector('.etiqueta')?.textContent}: ${fila.querySelector('.valor')?.textContent}`,
    );

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  it('muestra un esqueleto mientras consulta', async () => {
    crear();
    expect(elemento().querySelector('[aria-busy="true"]')).not.toBeNull();
    await responder(indicadores());
  });

  it('criterio 1: muestra usuarios, publicaciones, reservas y el dinero', async () => {
    crear();
    await responder(indicadores());

    expect(cifras()).toEqual([
      'Usuarios|120|110 activos / 80 huéspedes / 35 anfitriones',
      'Publicaciones activas|42|Visibles en el marketplace',
      'Reservas|45|En todos los estados',
      'Pagado por huéspedes|$ 15.250.000|Devoluciones $ 1.250.000 / Neto $ 14.000.000',
      'Comisión de la plataforma|$ 1.100.000|Después de devoluciones',
      'Ganancias de los anfitriones|$ 12.900.000|Después de devoluciones',
    ]);
    expect(elemento().querySelector('.subtitulo')?.textContent).toContain('Datos al 20 de nov');
  });

  it('criterio 1: muestra las reservas por estado en el orden del ciclo de la reserva', async () => {
    crear();
    await responder(indicadores({ reservasPorEstado: { CONFIRMADA: 3, NUEVO_ESTADO: 1 } }));

    expect(filas('titulo-reservas-estado')).toEqual([
      'Esperando aprobación: 0',
      'Pendiente de pago: 0',
      'Confirmada: 3',
      'Completada: 0',
      'Cancelada: 0',
      'Rechazada: 0',
      'Vencida: 0',
      'NUEVO_ESTADO: 1',
    ]);
  });

  it('criterio 1: muestra las ciudades con mayor demanda', async () => {
    crear();
    await responder(indicadores());

    expect(filas('titulo-ciudades')).toEqual(['Bogotá: 30', 'Medellín: 12']);
  });

  it('criterio 3: con pocos datos muestra los indicadores en cero y en singular', async () => {
    crear();
    await responder(
      indicadores({
        usuarios: { total: 1, activos: 1, huespedes: 1, anfitriones: 0 },
        publicacionesActivas: 0,
        reservasPorEstado: {},
        ingresosEstimados: 0,
        finanzas: {
          pagadoPorHuespedes: 0,
          devoluciones: 0,
          ingresosNetos: 0,
          comisionPlataforma: 0,
          gananciasAnfitriones: 0,
          reservasConPago: 0,
        },
        ciudadesConMayorDemanda: [],
      }),
    );

    expect(cifras()[0]).toBe('Usuarios|1|1 activo / 1 huésped / 0 anfitriones');
    expect(cifras()[3]).toBe('Pagado por huéspedes|$ 0|Devoluciones $ 0 / Neto $ 0');
    expect(cifras()[4]).toContain('Comisión de la plataforma|$ 0|');
    expect(cifras()[5]).toContain('Ganancias de los anfitriones|$ 0|');
    expect(seccion('titulo-ciudades').textContent).toContain(
      'Aún no hay cotizaciones registradas.',
    );
    expect(filas('titulo-reservas-estado')).toHaveLength(7);
  });

  it('con cifras enormes muestra la forma corta, no la parte en dos líneas y deja el valor completo en el título', async () => {
    crear();
    await responder(
      indicadores({
        finanzas: {
          pagadoPorHuespedes: 98765432100,
          devoluciones: 1250000000,
          ingresosNetos: 97515432100,
          comisionPlataforma: 9876543210,
          gananciasAnfitriones: 87638888890,
          reservasConPago: 40000,
        },
      }),
    );

    const cifrasDinero = [...elemento().querySelectorAll<HTMLElement>('.cifras li .cifra')].slice(3);
    expect(cifrasDinero).toHaveLength(3);
    for (const cifra of cifrasDinero) {
      expect(cifra.textContent!.trim().length).toBeLessThanOrEqual(12);
      expect(cifra.textContent).toContain('M');
      expect(cifra.getAttribute('title')).toContain('.');
    }
    expect(cifrasDinero[0].getAttribute('title')?.replaceAll(/\s/g, ' ')).toBe('$ 98.765.432.100');
  });

  it('actualiza los datos al pedirlo', async () => {
    crear();
    await responder(indicadores());

    const boton = elemento().querySelector('button.actualizar') as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();
    expect(boton.textContent).toContain('Actualizando');
    expect(boton.disabled).toBe(true);
    await responder(indicadores({ publicacionesActivas: 43 }));

    expect(elemento().querySelector('.cifras')?.textContent).toContain('43');
  });

  it('criterio 2: si no tiene permiso muestra el error y no los indicadores', async () => {
    crear();
    await responder(
      { mensaje: 'Solo un administrador puede consultar el dashboard.' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'Solo un administrador puede consultar el dashboard.',
    );
    expect(elemento().querySelector('.cifras')).toBeNull();
    (elemento().querySelector('button.enlace') as HTMLButtonElement).click();
    fixture.detectChanges();
    await responder(indicadores());
    expect(elemento().querySelector('.cifras')).not.toBeNull();
  });

  it('saluda por su nombre a quien inició sesión', async () => {
    localStorage.setItem(
      'marketplace.token',
      crearToken({
        sub: 'olga@correo.com',
        role: 'AUDITOR_OPERACION',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    crear();
    backend.expectOne(`${environment.apiUrl}/usuarios/mi_cuenta`).flush({ nombre: 'Olga' });
    await responder(indicadores());

    expect(texto(elemento().querySelector('.saludo'))).toBe('Hola, Olga');
    // La fecha va aparte, en la otra esquina, sin el punto separador.
    expect(texto(elemento().querySelector('.fecha-hoy'))).toMatch(/^\S+, \d{1,2} de \S+$/);
    expect(elemento().querySelector('.banda')?.textContent).not.toContain('·');
    expect(texto(elemento().querySelector('h1'))).toBe('Indicadores');
  });
});
