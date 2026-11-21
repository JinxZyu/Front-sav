import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SesionService } from '../../../config/auth/sesion.service';
import { crearToken } from '../../../config/auth/sesion.testing';
import { environment } from '../../../../environments/environment';
import { CrearPublicacion } from './crear-publicacion';
import { AvisosService } from '../../../shared/services/avisos.service';
import { simularUrlsDeObjeto } from '../../../shared/utils/url-objeto.testing';

describe('CrearPublicacion (HU-010)', () => {
  let restaurarUrls: () => void = () => undefined;
  let fixture: ComponentFixture<CrearPublicacion>;
  let componente: CrearPublicacion;
  let backend: HttpTestingController;
  const api = environment.apiUrl;
  const servicios = [
    { idServicio: 's-1', nombre: 'Wifi', descripcion: null },
    { idServicio: 's-2', nombre: 'Piscina', descripcion: 'Climatizada' },
  ];
  const politicas = [
    {
      idPolitica: 'p-1',
      nombre: 'Flexible',
      version: 1,
      descripcion: 'Hasta 24 horas antes.',
      anticipacionHoras: 24,
      porcentajeDevolucion: 100,
    },
    {
      idPolitica: 'p-2',
      nombre: 'Estricta',
      version: 1,
      descripcion: null,
      anticipacionHoras: null,
      porcentajeDevolucion: null,
    },
  ];

  const urlPaises = `${api}/autenticacion/ubicaciones/paises`;
  const paises = [
    { idPais: 'pa-co', codigoIso2: 'CO', nombre: 'Colombia' },
    { idPais: 'pa-pe', codigoIso2: 'PE', nombre: 'Perú' },
  ];
  const ciudadesDe = (idPais: string) => `${urlPaises}/${idPais}/ciudades`;

  const responderUbicaciones = async () => {
    backend.expectOne(urlPaises).flush(paises);
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(ciudadesDe('pa-co')).flush([
      { idCiudad: 'c-1', nombre: 'Bogotá' },
      { idCiudad: 'c-2', nombre: 'Guatavita' },
    ]);
  };

  const crear = async (responder = true) => {
    localStorage.clear();
    restaurarUrls = simularUrlsDeObjeto(() => 'blob:x', vi.fn());
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
      ],
    });
    TestBed.inject(SesionService).iniciar(
      crearToken({
        sub: 'sophie@correo.com',
        role: 'ANFITRION',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CrearPublicacion);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.tick();
    if (responder) {
      backend
        .expectOne(`${api}/usuarios/mi_cuenta`)
        .flush({ nombre: 'Sophia', apellido: 'Mora', correo: 'sophie@correo.com' });
      backend.expectOne(`${api}/servicios`).flush(servicios);
      backend.expectOne(`${api}/politicas-cancelacion/activas`).flush(politicas);
      await responderUbicaciones();
      await fixture.whenStable();
    }
  };

  const llenar = () => {
    componente.formulario.setValue({
      titulo: '  Cabaña frente al lago ',
      descripcion: 'Vista al lago',
      reglas: 'No fumar',
      ubicacion: 'Vereda El Lago',
      pais: 'pa-co',
      ciudad: 'Guatavita',
      tipoAlojamiento: 'Cabaña',
      capacidad: '4',
      habitaciones: '2',
      camas: '3',
      banos: '1',
      propietarioInmueble: '  Inversiones Rojas ',
      precioPorNoche: '250000',
      tarifaLimpieza: '30000',
      modoAceptacion: 'APROBACION',
      idPolitica: 'p-1',
      idsServicios: ['s-1'],
    });
    componente.imagenes.set([new File(['x'], 'sala.jpg', { type: 'image/jpeg' })]);
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const resumen = () => elemento().querySelector('.resumen-errores')?.textContent ?? '';

  afterEach(() => {
    backend.verify();
    restaurarUrls();
  });

  it('criterio 1: muestra a nombre de quién se publica, los servicios y las políticas', async () => {
    await crear();
    expect(elemento().querySelector('.propietario')?.textContent).toContain('Sophia Mora');
    expect(elemento().querySelector('.propietario')?.textContent).toContain('sophie@correo.com');
    expect(elemento().querySelectorAll('.servicio')).toHaveLength(2);
    expect(
      elemento().querySelectorAll('[aria-labelledby="etiqueta-politica"] .opcion'),
    ).toHaveLength(2);
    expect(elemento().textContent).toContain('Devolución: 100 %');
    expect(componente.formatearPorcentaje(null)).toBe('');
  });

  it('criterio 1: crea la publicación, avisa que quedó en borrador y vuelve a la lista', async () => {
    await crear();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    llenar();
    componente.publicar();

    const peticion = backend.expectOne(`${api}/alojamientos`);
    const cuerpo = peticion.request.body as FormData;
    expect(cuerpo.get('titulo')).toBe('Cabaña frente al lago');
    expect(cuerpo.get('ciudad')).toBe('Guatavita');
    expect(cuerpo.get('pais')).toBe('Colombia');
    expect(cuerpo.get('codigoPais')).toBe('CO');
    expect(cuerpo.get('capacidad')).toBe('4');
    expect(cuerpo.get('habitaciones')).toBe('2');
    expect(cuerpo.get('camas')).toBe('3');
    expect(cuerpo.get('banos')).toBe('1');
    expect(cuerpo.get('propietarioInmueble')).toBe('Inversiones Rojas');
    expect(cuerpo.get('precioPorNoche')).toBe('250000');
    expect(cuerpo.get('tarifaLimpieza')).toBe('30000');
    expect(cuerpo.get('modoAceptacion')).toBe('APROBACION');
    expect(cuerpo.getAll('idsServicios')).toEqual(['s-1']);
    expect(cuerpo.getAll('imagenes')).toHaveLength(1);
    peticion.flush({
      idPublicacion: 'x',
      titulo: 'Cabaña frente al lago',
      estado: 'BORRADOR',
      imagenes: [],
    });
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/alojamientos'], { replaceUrl: true });
    const [aviso] = TestBed.inject(AvisosService).avisos();
    expect(aviso.titulo).toBe('Publicación creada');
    expect(aviso.detalle).toContain('"Cabaña frente al lago" quedó en borrador');
  });

  it('el propietario del inmueble es opcional y el anfitrión puede indicar que es él', async () => {
    await crear();
    const campo = elemento().querySelector<HTMLInputElement>(
      'input[formcontrolname="propietarioInmueble"]',
    ) as HTMLInputElement;
    expect(campo.closest('label')?.textContent).toContain('(opcional)');
    expect(componente.formulario.controls.propietarioInmueble.valid).toBe(true);

    const boton = [...elemento().querySelectorAll<HTMLButtonElement>('button')].find((item) =>
      item.textContent?.includes('El propietario soy yo'),
    ) as HTMLButtonElement;
    expect(boton.textContent).toContain('Sophia Mora');
    boton.click();
    fixture.detectChanges();
    expect(campo.value).toBe('Sophia Mora');

    componente.formulario.controls.propietarioInmueble.setValue('x'.repeat(121));
    expect(componente.formulario.controls.propietarioInmueble.valid).toBe(false);
  });

  it('envía tarifa de limpieza 0 si se deja vacía', async () => {
    await crear();
    llenar();
    componente.formulario.controls.tarifaLimpieza.setValue('');
    componente.publicar();
    const peticion = backend.expectOne(`${api}/alojamientos`);
    expect((peticion.request.body as FormData).get('tarifaLimpieza')).toBe('0');
    peticion.flush({ titulo: 'x', estado: 'BORRADOR' });
  });

  it('criterio 2: informa los campos faltantes y no crea la publicación', async () => {
    await crear();
    componente.publicar();
    await fixture.whenStable();

    backend.expectNone(`${api}/alojamientos`);
    expect(resumen()).toContain('Título');
    expect(resumen()).toContain('Servicios');
    expect(resumen()).toContain('Imágenes');
    expect(elemento().querySelector('#error-titulo')).not.toBeNull();
    expect(elemento().querySelector('#error-imagenes')).not.toBeNull();
    expect(
      elemento().querySelector('input[formControlName="titulo"]')?.getAttribute('aria-invalid'),
    ).toBe('true');
  });

  it('marca como inválidos los grupos de reservas y servicios y los enlaza con su error', async () => {
    await crear();
    componente.publicar();
    await fixture.whenStable();

    const grupos = [...elemento().querySelectorAll('[role="radiogroup"], .servicios')];
    expect(grupos.map((grupo) => grupo.getAttribute('aria-invalid'))).toEqual([
      'true',
      'true',
      'true',
    ]);
    for (const [selector, error] of [
      ['input[formControlName="modoAceptacion"]', 'error-modoAceptacion'],
      ['input[formControlName="idPolitica"]', 'error-idPolitica'],
      ['.servicios input[type="checkbox"]', 'error-idsServicios'],
    ]) {
      const casilla = elemento().querySelector(selector);
      expect(casilla?.getAttribute('aria-invalid')).toBe('true');
      expect(casilla?.getAttribute('aria-describedby')).toBe(error);
      expect(elemento().querySelector(`#${error}`)).not.toBeNull();
    }

    llenar();
    await fixture.whenStable();
    expect(elemento().querySelector('[role="radiogroup"]')?.getAttribute('aria-invalid')).toBe(
      'false',
    );
  });

  it('el resumen de faltantes se actualiza al completar los campos', async () => {
    await crear();
    componente.publicar();
    await fixture.whenStable();

    llenar();
    await fixture.whenStable();
    expect(elemento().querySelector('.resumen-errores')).toBeNull();
  });

  it('criterio 3: rechaza una capacidad de cero o con decimales', async () => {
    await crear();
    llenar();
    componente.formulario.controls.capacidad.setValue('0');
    componente.publicar();
    await fixture.whenStable();
    backend.expectNone(`${api}/alojamientos`);
    expect(resumen()).toContain('Capacidad');

    componente.formulario.controls.capacidad.setValue('2.5');
    componente.publicar();
    backend.expectNone(`${api}/alojamientos`);
  });

  it('rechaza habitaciones, camas o baños fuera de 1 a 50 y enlaza el error', async () => {
    await crear();
    expect(componente.formulario.controls.habitaciones.value).toBe('1');
    llenar();
    componente.formulario.controls.habitaciones.setValue('0');
    componente.formulario.controls.camas.setValue('51');
    componente.formulario.controls.banos.setValue('1.5');
    componente.publicar();
    await fixture.whenStable();

    backend.expectNone(`${api}/alojamientos`);
    expect(resumen()).toContain('Habitaciones');
    expect(resumen()).toContain('Camas');
    expect(resumen()).toContain('Baños');
    const habitaciones = elemento().querySelector('input[name="habitaciones"]');
    expect(habitaciones?.getAttribute('aria-invalid')).toBe('true');
    expect(habitaciones?.getAttribute('aria-describedby')).toBe('error-habitaciones');
    expect(elemento().querySelector('#error-banos')?.textContent).toContain('entre 1 y 50');
  });

  it('criterio 4: rechaza un precio por noche de cero', async () => {
    await crear();
    llenar();
    componente.formulario.controls.precioPorNoche.setValue('0');
    componente.publicar();
    await fixture.whenStable();

    backend.expectNone(`${api}/alojamientos`);
    expect(resumen()).toContain('Precio por noche');
  });

  it('marca y desmarca servicios', async () => {
    await crear();
    const casilla = elemento().querySelector<HTMLInputElement>('.servicio input');
    casilla?.click();
    await fixture.whenStable();
    expect(componente.formulario.controls.idsServicios.value).toEqual(['s-1']);
    expect(componente.servicioMarcado('s-1')).toBe(true);

    casilla?.click();
    await fixture.whenStable();
    expect(componente.formulario.controls.idsServicios.value).toEqual([]);
  });

  it('criterio 5 y errores del backend: muestra el mensaje y conserva lo escrito', async () => {
    await crear();
    llenar();
    componente.publicar();
    backend
      .expectOne(`${api}/alojamientos`)
      .flush(
        { mensaje: 'Solo un usuario con rol ANFITRION puede crear alojamientos.' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(elemento().querySelector('form [role="alert"]:not(.resumen-errores)')?.textContent).toBe(
      'Solo un usuario con rol ANFITRION puede crear alojamientos.',
    );
    expect(componente.formulario.controls.titulo.value).toBe('  Cabaña frente al lago ');
    expect(componente.imagenes()).toHaveLength(1);
  });

  it('ignora envíos repetidos y bloquea el formulario mientras guarda', async () => {
    await crear();
    llenar();
    componente.publicar();
    componente.publicar();
    await fixture.whenStable();

    expect(elemento().querySelector<HTMLFieldSetElement>('fieldset')?.disabled).toBe(true);
    backend.expectOne(`${api}/alojamientos`).flush({ titulo: 'x', estado: 'BORRADOR' });
  });

  it('elige la ciudad según el país, con Colombia por defecto', async () => {
    await crear();
    const select = (nombre: string) =>
      elemento().querySelector<HTMLSelectElement>(`select[formControlName="${nombre}"]`);
    const opciones = (nombre: string) =>
      [...(select(nombre)?.options ?? [])].filter((opcion) => opcion.value).map((o) => o.text);

    expect(componente.formulario.controls.pais.value).toBe('pa-co');
    expect(opciones('pais')).toEqual(['Colombia', 'Perú']);
    expect(opciones('ciudad')).toEqual(['Bogotá', 'Guatavita']);

    componente.formulario.controls.ciudad.setValue('Bogotá');
    const pais = select('pais') as HTMLSelectElement;
    pais.value = 'pa-pe';
    pais.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(ciudadesDe('pa-pe')).flush([{ idCiudad: 'c-3', nombre: 'Lima' }]);
    await fixture.whenStable();

    expect(componente.formulario.controls.ciudad.value).toBe('');
    expect(opciones('ciudad')).toEqual(['Lima']);
    expect(elemento().textContent).toContain('Total de camas en todo el alojamiento.');
  });

  it('permite reintentar si no cargan los países', async () => {
    await crear(false);
    backend.expectOne(`${api}/usuarios/mi_cuenta`).flush({ nombre: 'Sophia', apellido: 'Mora' });
    backend.expectOne(`${api}/servicios`).flush(servicios);
    backend.expectOne(`${api}/politicas-cancelacion/activas`).flush(politicas);
    backend.expectOne(urlPaises).flush('Error', { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(elemento().querySelector('#error-pais')?.textContent).toContain('Error');
    elemento().querySelector<HTMLButtonElement>('#error-pais button')?.click();
    fixture.detectChanges();
    TestBed.tick();
    await responderUbicaciones();
    await fixture.whenStable();
    expect(elemento().querySelector('#error-pais')).toBeNull();
  });

  it('permite reintentar si no cargan los servicios o las políticas', async () => {
    await crear(false);
    backend.expectOne(`${api}/usuarios/mi_cuenta`).flush({ nombre: 'Sophia', apellido: 'Mora' });
    backend.expectOne(`${api}/servicios`).flush('Error', { status: 500, statusText: 'Error' });
    backend
      .expectOne(`${api}/politicas-cancelacion/activas`)
      .flush('Error', { status: 500, statusText: 'Error' });
    backend.expectOne(urlPaises).flush([]);
    await fixture.whenStable();

    const botones = [...elemento().querySelectorAll<HTMLButtonElement>('.boton-texto')];
    expect(botones).toHaveLength(2);
    botones.forEach((boton) => boton.click());
    TestBed.tick();
    backend.expectOne(`${api}/servicios`).flush([]);
    backend.expectOne(`${api}/politicas-cancelacion/activas`).flush([]);
    await fixture.whenStable();

    expect(elemento().textContent).toContain('No hay servicios disponibles');
    expect(elemento().textContent).toContain('No hay políticas de cancelación activas');
  });

  it('muestra que está cargando los servicios y las políticas', async () => {
    await crear(false);
    expect(elemento().textContent).toContain('Cargando servicios…');
    expect(elemento().textContent).toContain('Cargando políticas…');
    backend.match(() => true).forEach((pendiente) => pendiente.flush([]));
  });
});
