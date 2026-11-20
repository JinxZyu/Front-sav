import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SesionService } from '../../../config/auth/sesion.service';
import { crearToken } from '../../../config/auth/sesion.testing';
import { simularUrlsDeObjeto } from '../../../shared/utils/url-objeto.testing';
import { CrearPublicacion } from './crear-publicacion';

describe('CrearPublicacion en modo edición (HU-012)', () => {
  let fixture: ComponentFixture<CrearPublicacion>;
  let componente: CrearPublicacion;
  let backend: HttpTestingController;
  let router: Router;
  let restaurarUrls: () => void = () => undefined;
  const api = environment.apiUrl;
  const urlDetalle = `${api}/publicaciones/mis-publicaciones/p-9`;

  const detalle = (cambios: object = {}) => ({
    idPublicacion: 'p-9',
    idAlojamiento: 'a-9',
    idPolitica: 'p-1',
    titulo: 'Cabaña frente al lago',
    descripcion: 'Vista al embalse.',
    reglas: 'No fumar',
    precioPorNoche: 250000,
    tarifaLimpieza: 30000,
    modoAceptacion: 'APROBACION',
    estado: 'ACTIVA',
    fechaCreacion: '2026-11-18T10:00:00-05:00',
    fechaActualizacion: null,
    ubicacion: 'Vereda El Lago',
    ciudad: 'Guatavita',
    tipoAlojamiento: 'Cabaña',
    capacidad: 4,
    habitaciones: 2,
    camas: 3,
    banos: 1,
    servicios: [{ idServicio: 's-2', nombre: 'Piscina', descripcion: null }],
    imagenes: [],
    ...cambios,
  });

  const politicasActivas = [
    {
      idPolitica: 'p-1',
      nombre: 'Flexible',
      version: 1,
      descripcion: null,
      anticipacionHoras: null,
      porcentajeDevolucion: null,
    },
  ];
  const urlPoliticas = `${api}/politicas-cancelacion/activas`;
  const urlPaises = `${api}/autenticacion/ubicaciones/paises`;

  const estabilizar = async (completo = true) => {
    if (completo) {
      await fixture.whenStable();
      return;
    }
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
    TestBed.tick();
  };

  const crear = async (respuesta: object | null = detalle(), cargarPoliticas = true) => {
    localStorage.clear();
    restaurarUrls = simularUrlsDeObjeto(() => 'blob:x', vi.fn());
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ idPublicacion: 'p-9' })) },
        },
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
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(CrearPublicacion);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(`${api}/usuarios/mi_cuenta`).flush({ nombre: 'Sophia', apellido: 'Mora' });
    backend.expectOne(`${api}/servicios`).flush([
      { idServicio: 's-1', nombre: 'Wifi', descripcion: null },
      { idServicio: 's-2', nombre: 'Piscina', descripcion: null },
    ]);
    if (cargarPoliticas) {
      backend.expectOne(urlPoliticas).flush(politicasActivas);
    }
    backend.expectOne(urlPaises).flush([{ idPais: 'pa-co', codigoIso2: 'CO', nombre: 'Colombia' }]);
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(`${urlPaises}/pa-co/ciudades`).flush([{ idCiudad: 'c-1', nombre: 'Bogotá' }]);
    if (respuesta) {
      backend.expectOne(urlDetalle).flush(respuesta);
      await estabilizar(cargarPoliticas);
    }
  };

  const elemento = () => fixture.nativeElement as HTMLElement;

  afterEach(() => {
    backend.verify();
    restaurarUrls();
  });

  it('carga la publicación en el formulario con sus datos actuales', async () => {
    await crear();

    expect(elemento().querySelector('h1')?.textContent).toBe('Editar publicación');
    expect(elemento().querySelector('.propietario')).toBeNull();
    expect(componente.formulario.getRawValue()).toEqual({
      titulo: 'Cabaña frente al lago',
      descripcion: 'Vista al embalse.',
      reglas: 'No fumar',
      ubicacion: 'Vereda El Lago',
      pais: 'pa-co',
      ciudad: 'Guatavita',
      tipoAlojamiento: 'Cabaña',
      capacidad: '4',
      habitaciones: '2',
      camas: '3',
      banos: '1',
      precioPorNoche: '250000',
      tarifaLimpieza: '30000',
      modoAceptacion: 'APROBACION',
      idPolitica: 'p-1',
      idsServicios: ['s-2'],
    });
    const ciudades = [
      ...(elemento().querySelector<HTMLSelectElement>('select[formControlName="ciudad"]')
        ?.options ?? []),
    ]
      .filter((opcion) => opcion.value)
      .map((opcion) => opcion.text);
    expect(ciudades).toEqual(['Bogotá', 'Guatavita']);
    expect(elemento().querySelector('button[type="submit"]')?.textContent?.trim()).toBe(
      'Guardar cambios',
    );
    expect(elemento().querySelector('.acciones a')?.getAttribute('href')).toBe('/alojamientos/p-9');
  });

  it('criterio 1: guarda los cambios sin exigir imágenes nuevas y vuelve al detalle', async () => {
    await crear();
    componente.formulario.controls.titulo.setValue('  Cabaña renovada ');
    componente.publicar();

    const peticion = backend.expectOne(`${api}/publicaciones/p-9`);
    expect(peticion.request.method).toBe('PUT');
    const cuerpo = peticion.request.body as FormData;
    expect(cuerpo.get('titulo')).toBe('Cabaña renovada');
    expect(cuerpo.get('habitaciones')).toBe('2');
    expect(cuerpo.get('camas')).toBe('3');
    expect(cuerpo.getAll('idsServicios')).toEqual(['s-2']);
    expect(cuerpo.getAll('imagenes')).toEqual([]);
    peticion.flush({
      idPublicacion: 'p-9',
      titulo: 'Cabaña renovada',
      estado: 'ACTIVA',
      imagenes: [],
    });

    expect(router.navigate).toHaveBeenCalledWith(['/alojamientos', 'p-9'], {
      queryParams: { aviso: 'actualizada' },
      replaceUrl: true,
    });
  });

  it('envía las imágenes nuevas para reemplazar las actuales', async () => {
    await crear();
    componente.imagenes.set([new File(['x'], 'nueva.jpg', { type: 'image/jpeg' })]);
    await fixture.whenStable();

    expect(elemento().querySelector('#ayuda-imagenes')?.textContent).toContain('reemplazarán');
    componente.publicar();
    const peticion = backend.expectOne(`${api}/publicaciones/p-9`);
    expect((peticion.request.body as FormData).getAll('imagenes')).toHaveLength(1);
    peticion.flush({});
  });

  it('muestra las imágenes actuales de la publicación', async () => {
    await crear(null);
    backend.expectOne(urlDetalle).flush(
      detalle({
        imagenes: [
          {
            idImagen: 'i-2',
            rutaImagen: '/imagenes/publicaciones/b.jpg',
            orden: 2,
            esPortada: false,
          },
          {
            idImagen: 'i-1',
            rutaImagen: '/imagenes/publicaciones/a.jpg',
            orden: 1,
            esPortada: true,
          },
        ],
      }),
    );
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
    TestBed.tick();
    for (const pendiente of backend.match((peticion) => peticion.url.includes('/imagenes/'))) {
      pendiente.flush(new Blob(['x']));
    }
    await fixture.whenStable();

    const imagenes = elemento().querySelectorAll<HTMLImageElement>('.actuales img');
    expect([...imagenes].map((imagen) => imagen.alt)).toEqual([
      'Imagen actual 1',
      'Imagen actual 2',
    ]);
    expect(elemento().querySelector('#ayuda-imagenes')?.textContent).toContain('se conservan');
  });

  it('criterio 4: no guarda datos inválidos e indica qué corregir', async () => {
    await crear();
    componente.formulario.controls.titulo.setValue('   ');
    componente.formulario.controls.capacidad.setValue('0');
    componente.publicar();
    await fixture.whenStable();

    backend.expectNone(`${api}/publicaciones/p-9`);
    const resumen = elemento().querySelector('.resumen-errores')?.textContent ?? '';
    expect(resumen).toContain('Título');
    expect(resumen).toContain('Capacidad');
    expect(resumen).not.toContain('Imágenes');
  });

  it('criterio 3: muestra el rechazo del servidor y no sale del formulario', async () => {
    await crear();
    componente.publicar();
    backend
      .expectOne(`${api}/publicaciones/p-9`)
      .flush(
        { mensaje: 'No tienes permisos para modificar esta publicación.' },
        { status: 403, statusText: 'Forbidden' },
      );
    await fixture.whenStable();

    expect(elemento().querySelector('form .alerta')?.textContent).toBe(
      'No tienes permisos para modificar esta publicación.',
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('avisa si la publicación no existe o no es del anfitrión', async () => {
    await crear(null);
    backend
      .expectOne(urlDetalle)
      .flush({ mensaje: 'No existe' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(elemento().querySelector('form')).toBeNull();
    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'No encontramos esta publicación',
    );
  });

  it('permite reintentar si falla la carga', async () => {
    await crear(null);
    backend.expectOne(urlDetalle).flush('Error', { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    elemento().querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(urlDetalle).flush(detalle());
    await fixture.whenStable();

    expect(elemento().querySelector('form')).not.toBeNull();
  });

  it('pide elegir otra política si la actual ya no está activa y completa las reglas vacías', async () => {
    await crear(detalle({ idPolitica: 'p-vieja', reglas: null }));

    expect(componente.formulario.controls.idPolitica.value).toBe('');
    expect(componente.formulario.controls.reglas.value).toBe('');
    expect(elemento().textContent).toContain('La política que tenías ya no está activa');
  });

  it('no guarda hasta validar la política contra las activas y permite reintentar su carga', async () => {
    await crear(detalle(), false);
    const resumen = () => elemento().querySelector('.resumen-errores')?.textContent ?? '';

    componente.publicar();
    await estabilizar(false);
    backend.expectNone(`${api}/publicaciones/p-9`);
    expect(resumen()).toContain('Política de cancelación');

    backend.expectOne(urlPoliticas).flush('Error', { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    componente.publicar();
    backend.expectNone(`${api}/publicaciones/p-9`);

    const reintentar = [...elemento().querySelectorAll<HTMLButtonElement>('button')].find((boton) =>
      boton.textContent?.includes('Intentar de nuevo'),
    );
    reintentar?.click();
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(urlPoliticas).flush(politicasActivas);
    await fixture.whenStable();

    componente.publicar();
    backend
      .expectOne(`${api}/publicaciones/p-9`)
      .flush({ idPublicacion: 'p-9', titulo: 'x', estado: 'ACTIVA', imagenes: [] });
    expect(resumen()).toBe('');
  });

  it('no deja editar una publicación en revisión', async () => {
    await crear(detalle({ estado: 'PENDIENTE_REVISION' }));

    expect(elemento().querySelector('form')).toBeNull();
    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'Un administrador está revisando esta publicación',
    );
    expect(elemento().querySelector('[role="alert"] a')?.getAttribute('href')).toBe(
      '/alojamientos/p-9',
    );
  });

  it('conserva un tipo de alojamiento que no está en la lista', async () => {
    await crear(detalle({ tipoAlojamiento: 'Hostal' }));

    const opciones = [
      ...elemento().querySelectorAll('select[formControlName="tipoAlojamiento"] option'),
    ];
    expect(opciones.map((opcion) => opcion.textContent?.trim())).toContain('Hostal');
    expect(componente.formulario.controls.tipoAlojamiento.value).toBe('Hostal');
  });
});
