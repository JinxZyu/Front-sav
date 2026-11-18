import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ESPERA_REENVIO_SEGUNDOS, VerificarCorreo } from './verificar-correo';

describe('VerificarCorreo (HU-001)', () => {
  let fixture: ComponentFixture<VerificarCorreo>;
  let componente: VerificarCorreo;
  let backend: HttpTestingController;
  const api = environment.apiUrl;

  const crear = async (correo: string | null) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(correo ? { correo } : {}) },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(VerificarCorreo);
    componente = fixture.componentInstance;
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  };

  const textoPantalla = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));

  afterEach(() => {
    backend.verify();
    vi.useRealTimers();
  });

  it('toma el correo de la URL', async () => {
    await crear('ana@correo.com');
    expect(componente.formulario.controls.correo.value).toBe('ana@correo.com');
  });

  it('deja el correo vacío si no viene en la URL', async () => {
    await crear(null);
    expect(componente.formulario.controls.correo.value).toBe('');
  });

  it('no envía si el código no tiene 6 números', async () => {
    await crear('ana@correo.com');
    componente.formulario.controls.codigo.setValue('12a');
    componente.verificar();
    await fixture.whenStable();

    backend.expectNone(() => true);
    expect(componente.invalido('codigo')).toBe(true);
    expect(textoPantalla()).toContain('El código tiene 6 números');
  });

  it('activa la cuenta con un código válido', async () => {
    await crear('ana@correo.com');
    componente.formulario.controls.codigo.setValue('123456');
    componente.verificar();

    const peticion = backend.expectOne((r) => r.url === `${api}/verificacion-correo/confirmar`);
    expect(peticion.request.params.get('codigo')).toBe('123456');
    peticion.flush('Correo verificado correctamente.');
    await fixture.whenStable();

    expect(componente.verificado()).toBe(true);
    expect(textoPantalla()).toContain('Correo verificado');
  });

  it('muestra el mensaje del backend si el código es incorrecto', async () => {
    await crear('ana@correo.com');
    componente.formulario.controls.codigo.setValue('000000');
    componente.verificar();

    backend
      .expectOne((r) => r.url === `${api}/verificacion-correo/confirmar`)
      .flush('El código es incorrecto.', { status: 400, statusText: 'Bad Request' });

    expect(componente.verificado()).toBe(false);
    expect(componente.error()).toBe('El código es incorrecto.');
  });

  it('solo permite reenviar el código después de 60 segundos', async () => {
    await crear('ana@correo.com');
    expect(componente.segundosParaReenviar()).toBe(ESPERA_REENVIO_SEGUNDOS);

    vi.advanceTimersByTime(30_000);
    expect(componente.segundosParaReenviar()).toBe(30);

    vi.advanceTimersByTime(30_000);
    expect(componente.segundosParaReenviar()).toBe(0);
  });

  it('reenvía el código y reinicia la espera', async () => {
    await crear('ana@correo.com');
    vi.advanceTimersByTime(60_000);

    componente.reenviar();
    backend
      .expectOne((r) => r.url === `${api}/verificacion-correo/reenviar`)
      .flush('Se envió un nuevo código al correo electrónico.');

    expect(componente.aviso()).toBe('Se envió un nuevo código al correo electrónico.');
    expect(componente.segundosParaReenviar()).toBe(ESPERA_REENVIO_SEGUNDOS);
  });

  it('usa un aviso por defecto si el backend no manda texto', async () => {
    await crear('ana@correo.com');
    componente.reenviar();
    backend.expectOne((r) => r.url === `${api}/verificacion-correo/reenviar`).flush('');

    expect(componente.aviso()).toBe('Te enviamos un nuevo código.');
  });

  it('muestra el límite de reenvíos que informa el backend', async () => {
    await crear('ana@correo.com');
    componente.reenviar();
    backend
      .expectOne((r) => r.url === `${api}/verificacion-correo/reenviar`)
      .flush('Alcanzaste el máximo de 3 reenvíos por hora.', {
        status: 400,
        statusText: 'Bad Request',
      });

    expect(componente.error()).toBe('Alcanzaste el máximo de 3 reenvíos por hora.');
  });

  it('pide el correo antes de reenviar si está vacío', async () => {
    await crear(null);
    componente.reenviar();

    backend.expectNone(() => true);
    expect(componente.invalido('correo')).toBe(true);
  });

  it('detiene la cuenta regresiva al salir de la pantalla', async () => {
    await crear('ana@correo.com');
    fixture.destroy();
    vi.advanceTimersByTime(10_000);
    expect(componente.segundosParaReenviar()).toBe(ESPERA_REENVIO_SEGUNDOS);
  });

  it('ignora un segundo clic en reenviar mientras la primera solicitud sigue pendiente', async () => {
    await crear('ana@correo.com');
    vi.advanceTimersByTime(60_000);

    componente.reenviar();
    componente.reenviar();

    const peticiones = backend.match((r) => r.url === `${api}/verificacion-correo/reenviar`);
    expect(peticiones.length).toBe(1);
    expect(componente.reenviando()).toBe(true);

    peticiones[0].flush('Se envió un nuevo código.');
    expect(componente.reenviando()).toBe(false);
  });

  it('libera el botón de reenviar si la solicitud falla', async () => {
    await crear('ana@correo.com');
    componente.reenviar();
    backend
      .expectOne((r) => r.url === `${api}/verificacion-correo/reenviar`)
      .flush('Error', { status: 500, statusText: 'Error' });

    expect(componente.reenviando()).toBe(false);
  });

  it('marca el código inválido como aria-invalid', async () => {
    await crear('ana@correo.com');
    componente.formulario.controls.codigo.setValue('12');
    componente.verificar();
    await fixture.whenStable();

    const codigo = (fixture.nativeElement as HTMLElement).querySelector(
      'input[formControlName="codigo"]',
    );
    expect(codigo?.getAttribute('aria-invalid')).toBe('true');
  });

  it('cancela la verificación si el usuario sale de la pantalla', async () => {
    await crear('ana@correo.com');
    componente.formulario.controls.codigo.setValue('123456');
    componente.verificar();
    const peticion = backend.expectOne((r) => r.url === `${api}/verificacion-correo/confirmar`);

    fixture.destroy();

    expect(peticion.cancelled).toBe(true);
  });
});
