import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
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
  const cifras = () =>
    [...elemento().querySelectorAll('.cifras li')].map((cifra) =>
      ['.nombre', '.cifra', '.detalle'].map((clase) => texto(cifra.querySelector(clase))).join('|'),
    );
  const seccion = (id: string) =>
    elemento().querySelector(`section[aria-labelledby="${id}"]`) as HTMLElement;
  const filas = (id: string) =>
    [...seccion(id).querySelectorAll('li')].map(
      (fila) =>
        `${fila.querySelector('.etiqueta')?.textContent}: ${fila.querySelector('.valor')?.textContent}`,
    );

  afterEach(() => backend.verify());

  it('muestra un esqueleto mientras consulta', async () => {
    crear();
    expect(elemento().querySelector('[aria-busy="true"]')).not.toBeNull();
    await responder(indicadores());
  });

  it('criterio 1: muestra usuarios, publicaciones, reservas e ingresos', async () => {
    crear();
    await responder(indicadores());

    expect(cifras()).toEqual([
      'Usuarios|120|110 activos · 80 huéspedes · 35 anfitriones',
      'Publicaciones activas|42|Visibles en el marketplace',
      'Reservas|45|En todos los estados',
      'Ingresos estimados|$ 15.250.000|Suma de los pagos aprobados',
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
        ciudadesConMayorDemanda: [],
      }),
    );

    expect(cifras()[0]).toBe('Usuarios|1|1 activo · 1 huésped · 0 anfitriones');
    expect(cifras()[3]).toBe('Ingresos estimados|$ 0|Suma de los pagos aprobados');
    expect(seccion('titulo-ciudades').textContent).toContain(
      'Aún no hay cotizaciones registradas.',
    );
    expect(filas('titulo-reservas-estado')).toHaveLength(7);
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
});
