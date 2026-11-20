import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { simularUrlsDeObjeto } from '../../../shared/utils/url-objeto.testing';
import { ExportacionReporte, INTERVALO_CONSULTA_REPORTE } from '../../models/reporte.models';
import { Reportes } from './reportes';

const exportacion = (cambios: Partial<ExportacionReporte> = {}): ExportacionReporte => ({
  idExportacion: 'e-1',
  estado: 'SOLICITADO',
  formato: 'EXCEL',
  fechaSolicitud: '2026-11-20T15:00:00Z',
  mensaje: 'La exportación está en cola.',
  urlDescarga: null,
  ...cambios,
});

describe('Reportes (HU-044)', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/administracion/reportes/exportaciones`;

  const abrir = async (url = '/administracion/reportes') => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'administracion/reportes', component: Reportes },
          { path: 'administracion/reportes/:idExportacion', component: Reportes },
        ]),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
  };

  const esperar = () =>
    vi.isFakeTimers()
      ? vi.advanceTimersByTimeAsync(0)
      : new Promise((resolver) => setTimeout(resolver));

  const refrescar = async () => {
    await esperar();
    harness.detectChanges();
    TestBed.tick();
  };

  const responder = async (
    cuerpo: object,
    opciones?: { status: number; statusText: string },
    id = 'e-1',
  ) => {
    backend.expectOne(`${api}/${id}`).flush(cuerpo, opciones);
    await refrescar();
  };

  const elemento = () => harness.routeNativeElement as HTMLElement;
  const solicitado = () =>
    elemento().querySelector('section[aria-labelledby="titulo-solicitado"]') as HTMLElement | null;
  const boton = (texto: string) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('button')].find((item) =>
      item.textContent?.trim().startsWith(texto),
    ) as HTMLButtonElement;

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    backend.verify();
  });

  it('criterio 1: genera el reporte en el formato elegido y muestra su avance', async () => {
    await abrir();
    expect(solicitado()).toBeNull();
    expect(elemento().textContent).toContain('Queda registrado quién lo pidió y cuándo');
    expect(boton('PDF').getAttribute('aria-pressed')).toBe('true');

    boton('Excel').click();
    await refrescar();
    expect(boton('Excel').getAttribute('aria-pressed')).toBe('true');
    expect(boton('PDF').getAttribute('aria-pressed')).toBe('false');

    boton('Generar reporte').click();
    await refrescar();
    expect(boton('Solicitando').disabled).toBe(true);
    const peticion = backend.expectOne(api);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ formato: 'EXCEL' });
    peticion.flush(exportacion());
    await refrescar();
    await refrescar();

    expect(TestBed.inject(Router).url).toBe('/administracion/reportes/e-1');
    await responder(exportacion());
    expect(solicitado()?.querySelector('h2')?.textContent).toContain('Reporte en Excel');
    expect(solicitado()?.querySelector('.etiqueta')?.textContent?.trim()).toBe('En cola');
    expect(solicitado()?.textContent).toContain('Te avisaremos en tus notificaciones');
    expect(boton('Descargar')).toBeUndefined();
  });

  it('muestra por qué no se pudo solicitar el reporte', async () => {
    await abrir();
    boton('Generar reporte').click();
    backend
      .expectOne(api)
      .flush({ mensaje: 'El formato debe ser PDF o EXCEL.' }, { status: 400, statusText: 'Bad' });
    await refrescar();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'El formato debe ser PDF o EXCEL.',
    );
    expect(boton('Generar reporte').disabled).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/administracion/reportes');
  });

  it('consulta el avance hasta que el reporte está listo y lo descarga', async () => {
    const crear = vi.fn(() => 'blob:reporte');
    const revocar = vi.fn();
    const restaurar = simularUrlsDeObjeto(crear, revocar);
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      await abrir('/administracion/reportes/e-1');
      vi.useFakeTimers();
      await responder(exportacion({ estado: 'EN_PROCESO' }));
      expect(solicitado()?.querySelector('.etiqueta')?.textContent?.trim()).toBe('Generando');

      backend.expectNone(`${api}/e-1`);
      await vi.advanceTimersByTimeAsync(INTERVALO_CONSULTA_REPORTE);
      await responder(exportacion({ estado: 'COMPLETADO', urlDescarga: '/archivo' }));
      expect(solicitado()?.querySelector('.etiqueta')?.textContent?.trim()).toBe('Listo');

      await vi.advanceTimersByTimeAsync(INTERVALO_CONSULTA_REPORTE * 2);
      backend.expectNone(`${api}/e-1`);

      boton('Descargar Excel').click();
      await refrescar();
      expect(boton('Descargando').disabled).toBe(true);
      const archivo = new Blob(['datos']);
      const peticion = backend.expectOne(`${api}/e-1/archivo`);
      expect(peticion.request.responseType).toBe('blob');
      peticion.flush(archivo);
      await refrescar();

      expect(crear).toHaveBeenCalledWith(archivo);
      const enlace = clic.mock.contexts[0] as HTMLAnchorElement;
      expect(enlace.download).toBe('reporte-gestion-2026-11-20.xlsx');
      expect(enlace.href).toBe('blob:reporte');
      expect(boton('Descargar Excel').disabled).toBe(false);
      await vi.advanceTimersByTimeAsync(1000);
      expect(revocar).toHaveBeenCalledWith('blob:reporte');
    } finally {
      restaurar();
    }
  });

  it('avisa si el archivo ya no está disponible', async () => {
    await abrir('/administracion/reportes/e-1');
    await responder(exportacion({ estado: 'COMPLETADO', formato: 'PDF' }));

    boton('Descargar PDF').click();
    backend
      .expectOne(`${api}/e-1/archivo`)
      .flush(new Blob(['{}']), { status: 410, statusText: 'Gone' });
    await refrescar();

    expect(solicitado()?.querySelector('[role="alert"]')?.textContent).toContain(
      'ya no está disponible',
    );
  });

  it('si el reporte falló no ofrece descargarlo', async () => {
    await abrir('/administracion/reportes/e-1');
    await responder(exportacion({ estado: 'FALLIDO', formato: 'PDF' }));

    expect(solicitado()?.querySelector('.etiqueta')?.textContent?.trim()).toBe('Falló');
    expect(solicitado()?.textContent).toContain('Genera uno nuevo para intentarlo otra vez');
    expect(boton('Descargar')).toBeUndefined();
    expect(boton('Generar reporte')).toBeDefined();
  });

  it('avisa si el reporte no existe', async () => {
    await abrir('/administracion/reportes/e-9');
    await responder({}, { status: 404, statusText: 'Not Found' }, 'e-9');

    expect(elemento().querySelector('.vacio h2')?.textContent).toContain(
      'No encontramos este reporte',
    );
  });

  it('si falla la consulta permite reintentar', async () => {
    await abrir('/administracion/reportes/e-1');
    await responder({}, { status: 500, statusText: 'Error' });

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos consultar el reporte.',
    );
    boton('Reintentar').click();
    await refrescar();
    await responder(exportacion({ estado: 'COMPLETADO' }));
    expect(solicitado()?.querySelector('.etiqueta')?.textContent?.trim()).toBe('Listo');
  });
});
