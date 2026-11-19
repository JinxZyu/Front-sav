import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ConsultaFechas } from './consulta-fechas';

describe('ConsultaFechas (HU-023)', () => {
  let fixture: ComponentFixture<ConsultaFechas>;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/alojamientos/a-1/disponibilidad`;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ConsultaFechas);
    fixture.componentRef.setInput('idAlojamiento', 'a-1');
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  const elemento = () => fixture.nativeElement as HTMLElement;

  const consultar = (inicio: string, fin: string) => {
    fixture.componentInstance.formulario.setValue({ fechaInicio: inicio, fechaFin: fin });
    elemento().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
  };

  const respuesta = (cambios: object) => ({
    idAlojamiento: 'a-1',
    fechaInicio: '2026-12-01',
    fechaFin: '2026-12-05',
    disponible: false,
    cubiertoPorPeriodosDisponibles: true,
    nochesOcupadas: [],
    ...cambios,
  });

  it('criterio 1: informa que el rango está disponible', async () => {
    consultar('2026-12-01', '2026-12-05');
    const peticion = backend.expectOne((p) => p.url === url);
    expect(peticion.request.params.get('fechaInicio')).toBe('2026-12-01');
    expect(peticion.request.params.get('fechaFin')).toBe('2026-12-05');
    peticion.flush(respuesta({ disponible: true }));
    await fixture.whenStable();

    expect(elemento().querySelector('.si')?.textContent).toContain('Disponible del 1 de dic');
  });

  it('criterio 3: identifica las noches ocupadas', async () => {
    consultar('2026-12-01', '2026-12-05');
    backend.expectOne((p) => p.url === url).flush(respuesta({ nochesOcupadas: ['2026-12-02'] }));
    await fixture.whenStable();

    expect(elemento().querySelector('.no')?.textContent).toContain('hay noches ocupadas');
    expect(elemento().querySelector('.no')?.textContent).toContain('2 de dic');
  });

  it('avisa si las fechas no están en un periodo habilitado', async () => {
    consultar('2026-12-01', '2026-12-05');
    backend
      .expectOne((p) => p.url === url)
      .flush(respuesta({ cubiertoPorPeriodosDisponibles: false }));
    await fixture.whenStable();

    expect(elemento().querySelector('.no')?.textContent).toContain('periodo habilitado');
  });

  it('criterio 4: no consulta un rango inválido y muestra el error del servidor', async () => {
    consultar('2026-12-05', '2026-12-05');
    await fixture.whenStable();
    backend.expectNone((p) => p.url === url);
    expect(elemento().querySelector('#error-consulta')?.textContent).toContain('posterior');

    consultar('2026-12-01', '2026-12-05');
    backend
      .expectOne((p) => p.url === url)
      .flush({ mensaje: 'Las fechas no son válidas.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'Las fechas no son válidas.',
    );
  });
});
