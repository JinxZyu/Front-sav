import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Registro } from './registro';

describe('Registro (HU-001)', () => {
  let fixture: ComponentFixture<Registro>;
  let componente: Registro;
  let backend: HttpTestingController;
  let router: Router;
  const url = `${environment.apiUrl}/autenticacion/registrar`;
  const urlPaises = `${environment.apiUrl}/autenticacion/ubicaciones/paises`;
  const urlCiudades = (idPais: string) => `${urlPaises}/${idPais}/ciudades`;
  const paises = [
    { idPais: 'p-co', codigoIso2: 'CO', nombre: 'Colombia' },
    { idPais: 'p-es', codigoIso2: 'ES', nombre: 'Spain' },
    { idPais: 'p-xx', codigoIso2: 'XX', nombre: 'Atlantis' },
  ];
  const ciudadesColombia = [
    { idCiudad: 'c-bog', nombre: 'Bogotá' },
    { idCiudad: 'c-med', nombre: 'Medellín' },
  ];

  const datosValidos = {
    nombre: ' Ana ',
    apellido: 'Pérez',
    correo: 'Ana@Correo.com',
    tipoDocumento: 'CC',
    documentoIdentidad: '1012345678',
    indicativo: '57',
    telefono: '3001234567',
    contrasena: 'clave-segura',
    idPais: 'p-co',
    idCiudad: 'c-bog',
    rol: 'ANFITRION' as const,
  };

  const elemento = () => fixture.nativeElement as HTMLElement;

  const responderCiudades = async (idPais: string, respuesta: object = ciudadesColombia) => {
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(urlCiudades(idPais)).flush(respuesta);
    await fixture.whenStable();
  };

  const textoPantalla = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(Registro);
    componente = fixture.componentInstance;
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(urlPaises).flush(paises);
    await responderCiudades('p-co');
  });

  afterEach(() => backend.verify());

  it('no envía el formulario vacío y muestra los campos obligatorios', async () => {
    componente.registrar();
    await fixture.whenStable();

    backend.expectNone(url);
    expect(textoPantalla()).toContain('El nombre es obligatorio');
    expect(textoPantalla()).toContain('Ingresa un correo válido');
    expect(textoPantalla()).toContain('La contraseña debe tener al menos 8 caracteres');
  });

  it('marca correo y teléfono con formato inválido antes de enviar', async () => {
    componente.formulario.patchValue({ ...datosValidos, correo: 'no-es-correo', telefono: '12ab' });
    componente.formulario.controls.correo.markAsDirty();
    componente.formulario.controls.telefono.markAsDirty();
    await fixture.whenStable();

    expect(componente.invalido('correo')).toBe(true);
    expect(componente.invalido('telefono')).toBe(true);
    expect(textoPantalla()).toContain('Ingresa un número válido para el indicativo elegido');
    const campoTelefono = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[formControlName="telefono"]',
    );
    const idError = campoTelefono?.getAttribute('aria-describedby');
    expect(idError).toBe('error-telefono');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(`#${idError}`)?.textContent,
    ).toContain('Ingresa un número válido');
  });

  it('registra con datos limpios y lleva a verificar el correo', () => {
    componente.formulario.setValue(datosValidos);
    componente.registrar();

    const peticion = backend.expectOne(url);
    expect(peticion.request.body).toEqual({
      nombre: 'Ana',
      apellido: 'Pérez',
      correo: 'ana@correo.com',
      tipoDocumento: 'CC',
      documentoIdentidad: '1012345678',
      telefono: '+573001234567',
      contrasena: 'clave-segura',
      idCiudad: 'c-bog',
      rol: 'ANFITRION',
    });
    expect(componente.enviando()).toBe(true);
    peticion.flush('Usuario creado.', { status: 201, statusText: 'Created' });

    expect(componente.enviando()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/usuario/verificar-correo'], {
      queryParams: { correo: 'ana@correo.com' },
    });
  });

  it('informa que los datos pueden estar ya registrados si el backend responde 400', async () => {
    componente.formulario.setValue(datosValidos);
    componente.registrar();

    backend
      .expectOne(url)
      .flush('Datos inválidos o usuario existente.', { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(componente.error()).toContain('ya estén registrados');
    expect(textoPantalla()).toContain('ya estén registrados');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor en otros casos', () => {
    componente.formulario.setValue(datosValidos);
    componente.registrar();

    backend.expectOne(url).flush('Falla interna', { status: 500, statusText: 'Error' });

    expect(componente.error()).toBe('Falla interna');
  });

  it('une el indicativo elegido con el número', () => {
    componente.formulario.setValue({ ...datosValidos, indicativo: '52', telefono: '5512345678' });
    componente.registrar();

    const peticion = backend.expectOne(url);
    expect(peticion.request.body.telefono).toBe('+525512345678');
    peticion.flush('Usuario creado.', { status: 201, statusText: 'Created' });
  });

  it('acepta el número con espacios o con el indicativo escrito', () => {
    componente.formulario.setValue({ ...datosValidos, telefono: '+57 300 123 4567' });
    componente.registrar();

    const peticion = backend.expectOne(url);
    expect(peticion.request.body.telefono).toBe('+573001234567');
    peticion.flush('Usuario creado.', { status: 201, statusText: 'Created' });
  });

  it('envía el número normalizado aunque tenga espacios alrededor', () => {
    componente.formulario.setValue({ ...datosValidos, telefono: ' +57 300 123 4567 ' });
    componente.registrar();

    const peticion = backend.expectOne(url);
    expect(peticion.request.body.telefono).toBe('+573001234567');
    peticion.flush('Usuario creado.', { status: 201, statusText: 'Created' });
  });

  it('vuelve a validar el número al cambiar de país', async () => {
    componente.formulario.patchValue({ telefono: '3001234567' });
    expect(componente.formulario.controls.telefono.valid).toBe(true);

    componente.formulario.controls.indicativo.setValue('34');
    await fixture.whenStable();

    expect(componente.formulario.controls.telefono.hasError('telefono')).toBe(true);
    const campo = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[formControlName="telefono"]',
    );
    expect(campo?.placeholder).toMatch(/\d/);
  });

  it('muestra solo el indicativo, con +57 por defecto', async () => {
    await fixture.whenStable();
    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
      'select[formControlName="indicativo"]',
    );
    expect(select?.selectedOptions[0]?.textContent?.trim()).toBe('+57');
  });

  it('explica un 401 del registro como un problema del servidor', () => {
    componente.formulario.setValue(datosValidos);
    componente.registrar();

    backend
      .expectOne(url)
      .flush('{"mensaje":"Debes iniciar sesión para acceder a este recurso."}', {
        status: 401,
        statusText: 'Unauthorized',
      });

    expect(componente.error()).toContain('problema del servidor');
  });

  it('no acepta un nombre o apellido hecho solo de espacios', () => {
    componente.formulario.setValue({ ...datosValidos, nombre: '   ', apellido: '  ' });
    componente.registrar();

    backend.expectNone(url);
    expect(componente.formulario.controls.nombre.invalid).toBe(true);
    expect(componente.formulario.controls.apellido.invalid).toBe(true);
  });

  it('marca los campos con error como aria-invalid', async () => {
    componente.registrar();
    await fixture.whenStable();

    const nombre = (fixture.nativeElement as HTMLElement).querySelector(
      'input[formControlName="nombre"]',
    );
    expect(nombre?.getAttribute('aria-invalid')).toBe('true');
  });

  it('cancela la petición si el usuario sale de la pantalla', () => {
    componente.formulario.setValue(datosValidos);
    componente.registrar();
    const peticion = backend.expectOne(url);

    fixture.destroy();

    expect(peticion.cancelled).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('carga los países, elige Colombia por defecto y trae sus ciudades', () => {
    expect(componente.formulario.controls.idPais.value).toBe('p-co');
    const opciones = [
      ...elemento().querySelectorAll('select[formControlName="idCiudad"] option'),
    ].map((opcion) => opcion.textContent?.trim());
    expect(opciones).toEqual(['Elige tu ciudad', 'Bogotá', 'Medellín']);
  });

  it('al cambiar de país limpia la ciudad, trae las nuevas y ajusta el indicativo', async () => {
    componente.formulario.controls.idCiudad.setValue('c-bog');
    componente.formulario.controls.idPais.setValue('p-es');
    await responderCiudades('p-es', [{ idCiudad: 'c-mad', nombre: 'Madrid' }]);

    expect(componente.formulario.controls.idCiudad.value).toBe('');
    expect(componente.formulario.controls.indicativo.value).toBe('34');
    expect(elemento().textContent).toContain('Madrid');
  });

  it('no cambia el indicativo si la persona ya lo eligió', async () => {
    componente.formulario.controls.indicativo.setValue('52');
    componente.formulario.controls.indicativo.markAsDirty();
    componente.formulario.controls.idPais.setValue('p-es');
    await responderCiudades('p-es', []);

    expect(componente.formulario.controls.indicativo.value).toBe('52');
    expect(elemento().textContent).toContain('No hay ciudades para este país');
  });

  it('deja el indicativo igual si el país no tiene uno conocido', async () => {
    componente.formulario.controls.idPais.setValue('p-xx');
    await responderCiudades('p-xx', []);

    expect(componente.formulario.controls.indicativo.value).toBe('57');
  });

  it('exige la ciudad antes de registrar', async () => {
    componente.formulario.setValue({ ...datosValidos, idCiudad: '' });
    componente.registrar();
    await fixture.whenStable();

    backend.expectNone(url);
    const ciudad = elemento().querySelector('select[formControlName="idCiudad"]');
    expect(ciudad?.getAttribute('aria-invalid')).toBe('true');
    expect(ciudad?.getAttribute('aria-describedby')).toBe('error-ciudad');
    expect(elemento().querySelector('#error-ciudad')?.textContent).toContain('Elige tu ciudad');
  });

  it('permite reintentar si fallan las ciudades', async () => {
    componente.formulario.controls.idPais.setValue('p-es');
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(urlCiudades('p-es')).flush('Error', { status: 503, statusText: 'Error' });
    await fixture.whenStable();

    expect(elemento().querySelector('#error-ciudad')?.textContent).toContain('Error');
    elemento().querySelector<HTMLButtonElement>('#error-ciudad button')?.click();
    await responderCiudades('p-es', [{ idCiudad: 'c-mad', nombre: 'Madrid' }]);

    expect(elemento().querySelector('#error-ciudad')).toBeNull();
    expect(elemento().textContent).toContain('Madrid');
  });
});

describe('Registro (HU-001) con códigos de país en minúscula', () => {
  it('igual elige Colombia por defecto y ajusta el indicativo', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(Registro);
    const backend = TestBed.inject(HttpTestingController);
    const urlPaises = `${environment.apiUrl}/autenticacion/ubicaciones/paises`;
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(urlPaises).flush([
      { idPais: 'p-es', codigoIso2: 'es', nombre: 'Spain' },
      { idPais: 'p-co', codigoIso2: 'co', nombre: 'Colombia' },
    ]);
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(`${urlPaises}/p-co/ciudades`).flush([]);
    await fixture.whenStable();

    const formulario = fixture.componentInstance.formulario;
    expect(formulario.controls.idPais.value).toBe('p-co');
    formulario.controls.idPais.setValue('p-es');
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(`${urlPaises}/p-es/ciudades`).flush([]);
    await fixture.whenStable();
    expect(formulario.controls.indicativo.value).toBe('34');
    backend.verify();
  });
});

describe('Registro (HU-001) sin países disponibles', () => {
  it('avisa si no se pudieron cargar los países y permite reintentar', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(Registro);
    const backend = TestBed.inject(HttpTestingController);
    const urlPaises = `${environment.apiUrl}/autenticacion/ubicaciones/paises`;
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(urlPaises).flush('Sin conexión', { status: 503, statusText: 'Error' });
    await fixture.whenStable();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('#error-pais')?.textContent).toContain('Sin conexión');
    elemento.querySelector<HTMLButtonElement>('#error-pais button')?.click();
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(urlPaises).flush([]);
    await fixture.whenStable();

    expect(elemento.querySelector('#error-pais')).toBeNull();
    backend.verify();
  });
});
