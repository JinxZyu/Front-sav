import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { moverDias, hoy } from '../../../disponibilidad/utils/fechas';
import { publicacionPublica } from '../../../publicacion/models/catalogo.testing';
import { Cotizador } from './cotizador';

describe('Cotizador (HU-028)', () => {
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

  const crear = (entradas: Record<string, string> = {}) => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Cotizador);
    fixture.componentRef.setInput('publicacion', datos.publicacion);
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    fixture.detectChanges();
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
    expect(texto).toContain('Puedes reservar para 1 a 4 huéspedes.');
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
});
