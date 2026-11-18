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

  const datosValidos = {
    nombre: ' Ana ',
    apellido: 'Pérez',
    correo: 'Ana@Correo.com',
    tipoDocumento: 'CC',
    documentoIdentidad: '1012345678',
    indicativo: 'CO' as const,
    telefono: '3001234567',
    contrasena: 'clave-segura',
    rol: 'ANFITRION' as const,
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
    await fixture.whenStable();
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
    expect(textoPantalla()).toContain('Ingresa un número válido para el país elegido');
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

  it('une el indicativo del país elegido con el número', () => {
    componente.formulario.setValue({ ...datosValidos, indicativo: 'MX', telefono: '5512345678' });
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

  it('vuelve a validar el número al cambiar de país', async () => {
    componente.formulario.patchValue({ telefono: '3001234567' });
    expect(componente.formulario.controls.telefono.valid).toBe(true);

    componente.formulario.controls.indicativo.setValue('ES');
    await fixture.whenStable();

    expect(componente.formulario.controls.telefono.hasError('telefono')).toBe(true);
    const campo = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[formControlName="telefono"]',
    );
    expect(campo?.placeholder).toMatch(/\d/);
  });

  it('muestra Colombia como país por defecto en el teléfono', async () => {
    await fixture.whenStable();
    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
      'select[formControlName="indicativo"]',
    );
    expect(select?.selectedOptions[0]?.textContent?.trim()).toBe('Colombia +57');
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
});
