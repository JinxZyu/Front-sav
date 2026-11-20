import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AvisosService } from '../../../shared/services/avisos.service';
import { configuracionTarifa } from '../../models/tarifa.testing';
import { ConfiguracionTarifas } from './configuracion-tarifas';

describe('ConfiguracionTarifas (HU-026)', () => {
  let fixture: ComponentFixture<ConfiguracionTarifas>;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/administracion/tarifas/configuracion-vigente`;

  const crear = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ConfiguracionTarifas);
    fixture.detectChanges();
    TestBed.tick();
  };

  const responder = async (cuerpo: object, opciones?: { status: number; statusText: string }) => {
    backend
      .expectOne((peticion) => peticion.method === 'GET' && peticion.url === api)
      .flush(cuerpo, opciones);
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const campo = (id: string) => elemento().querySelector(`#${id}`) as HTMLInputElement;
  const escribir = async (id: string, valor: string) => {
    campo(id).value = valor;
    campo(id).dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const enviar = () => {
    elemento().querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  afterEach(() => backend.verify());

  it('muestra un esqueleto mientras consulta', async () => {
    crear();
    expect(elemento().querySelector('[aria-busy="true"]')).not.toBeNull();
    await responder(configuracionTarifa());
  });

  it('criterio 2: muestra los valores vigentes y los carga en el formulario', async () => {
    crear();
    await responder(configuracionTarifa({ porcentajeServicio: 12.5, porcentajeDescuento: 3 }));

    const vigente = elemento().querySelector('.vigente') as HTMLElement;
    expect(vigente.textContent).toContain('12,5 %');
    expect(vigente.textContent).toContain('3 %');
    expect(vigente.textContent).toContain('Vigentes desde el 15 de nov');
    expect(campo('porcentaje-servicio').value).toBe('12.5');
    expect(campo('porcentaje-descuento').value).toBe('3');
    expect(elemento().textContent).toContain('Cambiar porcentajes');
  });

  it('criterio 1 y 3: guarda los nuevos porcentajes y muestra los vigentes', async () => {
    crear();
    await responder(configuracionTarifa());
    const mostrar = vi.spyOn(TestBed.inject(AvisosService), 'mostrar');

    await escribir('porcentaje-servicio', '15,25');
    await escribir('porcentaje-descuento', '5');
    enviar();

    expect(
      (elemento().querySelector('button[type="submit"]') as HTMLButtonElement).textContent,
    ).toContain('Guardando');
    const peticion = backend.expectOne((solicitud) => solicitud.method === 'PUT');
    expect(peticion.request.body).toEqual({ porcentajeServicio: 15.25, porcentajeDescuento: 5 });
    peticion.flush(configuracionTarifa({ porcentajeServicio: 15.25, porcentajeDescuento: 5 }));
    fixture.detectChanges();

    expect(mostrar).toHaveBeenCalledWith(
      'Tarifas actualizadas',
      'Las nuevas cotizaciones ya usan estos porcentajes.',
    );
    await responder(configuracionTarifa({ porcentajeServicio: 15.25, porcentajeDescuento: 5 }));
    expect(elemento().querySelector('.vigente')?.textContent).toContain('15,25 %');
    expect(campo('porcentaje-servicio').value).toBe('15.25');
  });

  it('no guarda valores vacíos, mayores que 100 o con más de dos decimales', async () => {
    crear();
    await responder(configuracionTarifa());

    await escribir('porcentaje-servicio', '');
    await escribir('porcentaje-descuento', '101');
    enviar();
    expect(campo('porcentaje-servicio').getAttribute('aria-invalid')).toBe('true');
    expect(campo('porcentaje-descuento').getAttribute('aria-invalid')).toBe('true');

    await escribir('porcentaje-servicio', '10.555');
    await escribir('porcentaje-descuento', '-1');
    enviar();
    expect(campo('porcentaje-servicio').getAttribute('aria-invalid')).toBe('true');
    expect(campo('porcentaje-descuento').getAttribute('aria-invalid')).toBe('true');
    backend.expectNone((solicitud) => solicitud.method === 'PUT');
  });

  it('muestra el error del servidor', async () => {
    crear();
    await responder(configuracionTarifa());

    enviar();
    backend
      .expectOne((solicitud) => solicitud.method === 'PUT')
      .flush(
        { mensaje: 'El porcentaje de servicio no puede superar 100.' },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(elemento().querySelector('form [role="alert"]')?.textContent).toContain(
      'El porcentaje de servicio no puede superar 100.',
    );
  });

  it('sin configuración previa permite crearla', async () => {
    crear();
    await responder(
      { mensaje: 'No existe una configuración vigente.' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(elemento().querySelector('.vigente')?.textContent).toContain(
      'Aún no hay porcentajes configurados',
    );
    expect(elemento().textContent).toContain('Configurar porcentajes');
    expect(campo('porcentaje-servicio').value).toBe('');
  });

  it('si falla la consulta permite reintentar', async () => {
    crear();
    await responder({}, { status: 500, statusText: 'Error' });

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos consultar las tarifas vigentes.',
    );
    (elemento().querySelector('button.enlace') as HTMLButtonElement).click();
    fixture.detectChanges();
    await responder(configuracionTarifa());
    expect(elemento().querySelector('.vigente')).not.toBeNull();
  });
});
