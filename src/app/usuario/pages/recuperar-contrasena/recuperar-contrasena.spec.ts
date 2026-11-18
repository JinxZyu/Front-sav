import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { TIEMPO_ESPERA_RECUPERACION_MS } from '../../services/autenticacion.service';
import { RecuperarContrasena } from './recuperar-contrasena';

describe('RecuperarContrasena (HU-005)', () => {
  let fixture: ComponentFixture<RecuperarContrasena>;
  let componente: RecuperarContrasena;
  let backend: HttpTestingController;
  const urlSolicitar = `${environment.apiUrl}/recuperacion-contrasena/solicitar`;
  const urlRestablecer = `${environment.apiUrl}/recuperacion-contrasena/restablecer`;

  const crear = async (correo?: string) => {
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
    fixture = TestBed.createComponent(RecuperarContrasena);
    componente = fixture.componentInstance;
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  };

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  const llegarAlCodigo = async () => {
    await crear('Ana@Correo.com');
    componente.solicitarCodigo();
    backend
      .expectOne(urlSolicitar)
      .flush({ mensaje: 'Si el correo está registrado, recibirás instrucciones.' });
    await fixture.whenStable();
  };

  const llenarCodigo = (confirmacion = 'nueva-clave') =>
    componente.formularioCodigo.setValue({
      codigo: '123456',
      nuevaContrasena: 'nueva-clave',
      confirmacion,
    });

  afterEach(() => backend.verify());

  it('toma el correo de la URL', async () => {
    await crear('ana@correo.com');
    expect(componente.formularioCorreo.controls.correo.value).toBe('ana@correo.com');
  });

  it('pide un correo válido antes de solicitar el código', async () => {
    await crear();
    componente.solicitarCodigo();
    await fixture.whenStable();

    backend.expectNone(urlSolicitar);
    expect(texto()).toContain('Ingresa un correo válido');
  });

  it('criterio 1: solicita el código y pasa al siguiente paso', async () => {
    await crear('Ana@Correo.com');
    componente.solicitarCodigo();

    const peticion = backend.expectOne(urlSolicitar);
    expect(peticion.request.body).toEqual({ correo: 'ana@correo.com' });
    peticion.flush({ mensaje: 'Si el correo está registrado, recibirás instrucciones.' });
    await fixture.whenStable();

    expect(componente.paso()).toBe('codigo');
    expect(texto()).toContain('Vence en 5 minutos');
    expect(texto()).toContain('ana@correo.com');
  });

  it('usa un aviso por defecto si el backend no manda mensaje', async () => {
    await crear('ana@correo.com');
    componente.solicitarCodigo();
    backend.expectOne(urlSolicitar).flush({ mensaje: '' });

    expect(componente.aviso()).toContain('te enviamos un código');
  });

  it('criterio 4: informa si no se pudo enviar el correo y permite reintentar', async () => {
    await crear('ana@correo.com');
    componente.solicitarCodigo();
    backend
      .expectOne(urlSolicitar)
      .flush(
        { mensaje: 'No fue posible procesar la solicitud en este momento.' },
        { status: 500, statusText: 'Error' },
      );
    await fixture.whenStable();

    expect(componente.paso()).toBe('correo');
    expect(componente.enviando()).toBe(false);
    expect(texto()).toContain('No fue posible procesar la solicitud');

    componente.solicitarCodigo();
    backend.expectOne(urlSolicitar).flush({ mensaje: 'Listo' });
    expect(componente.paso()).toBe('codigo');
  });

  it('valida el código, la longitud y que las contraseñas coincidan', async () => {
    await llegarAlCodigo();
    componente.formularioCodigo.setValue({
      codigo: '12',
      nuevaContrasena: 'corta',
      confirmacion: 'otra',
    });
    componente.formularioCodigo.markAllAsTouched();
    componente.restablecer();
    await fixture.whenStable();

    backend.expectNone(urlRestablecer);
    expect(texto()).toContain('El código tiene 6 números');
    expect(texto()).toContain('al menos 8 caracteres');
    expect(texto()).toContain('Las contraseñas no coinciden');
  });

  it('pide confirmar la contraseña si se deja vacía', async () => {
    await llegarAlCodigo();
    componente.formularioCodigo.setValue({
      codigo: '123456',
      nuevaContrasena: 'nueva-clave',
      confirmacion: '',
    });
    componente.restablecer();
    await fixture.whenStable();

    expect(texto()).toContain('Confirma tu contraseña nueva');
  });

  it('criterio 3: restablece la contraseña con un código vigente', async () => {
    await llegarAlCodigo();
    llenarCodigo();
    componente.restablecer();

    const peticion = backend.expectOne(urlRestablecer);
    expect(peticion.request.body).toEqual({
      correo: 'ana@correo.com',
      codigo: '123456',
      nuevaContrasena: 'nueva-clave',
    });
    peticion.flush({ mensaje: 'La contraseña se ha actualizado correctamente.' });
    await fixture.whenStable();

    expect(componente.paso()).toBe('listo');
    expect(texto()).toContain('La contraseña se ha actualizado correctamente.');
    expect(texto()).toContain('Ir a iniciar sesión');
  });

  it('usa un aviso por defecto al terminar si el backend no manda mensaje', async () => {
    await llegarAlCodigo();
    llenarCodigo();
    componente.restablecer();
    backend.expectOne(urlRestablecer).flush({ mensaje: '' });

    expect(componente.aviso()).toContain('se actualizó correctamente');
  });

  it('criterios 5 y 6: con código vencido, usado o incorrecto ofrece solicitar uno nuevo', async () => {
    await llegarAlCodigo();
    llenarCodigo();
    componente.restablecer();
    backend
      .expectOne(urlRestablecer)
      .flush(
        { mensaje: 'El código es inválido, ha vencido o no se pudo completar la recuperación.' },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(componente.paso()).toBe('codigo');
    expect(texto()).toContain('El código es inválido, ha vencido');
    expect(texto()).toContain('Solicitar un código nuevo');

    componente.pedirOtroCodigo();
    const nueva = backend.expectOne(urlSolicitar);
    expect(nueva.request.body).toEqual({ correo: 'ana@correo.com' });
    nueva.flush({ mensaje: 'Revisa tu correo.' });

    expect(componente.codigoRechazado()).toBe(false);
    expect(componente.formularioCodigo.controls.codigo.value).toBe('');
  });

  it('usa un mensaje por defecto si el rechazo no trae texto', async () => {
    await llegarAlCodigo();
    llenarCodigo();
    componente.restablecer();
    backend.expectOne(urlRestablecer).flush(null, { status: 400, statusText: 'Bad Request' });

    expect(componente.error()).toContain('Solicita uno nuevo');
  });

  it('permite volver a escribir otro correo', async () => {
    await llegarAlCodigo();
    componente.usarOtroCorreo();
    await fixture.whenStable();

    expect(componente.paso()).toBe('correo');
    expect(texto()).toContain('Enviar código');
  });

  it('bloquea el correo mientras se solicita el código', async () => {
    await crear('ana@correo.com');
    componente.solicitarCodigo();
    await fixture.whenStable();

    const campo = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="email"]',
    );
    expect(campo?.readOnly).toBe(true);

    backend.expectOne(urlSolicitar).flush({ mensaje: 'Revisa tu correo.' });
  });

  it('restablece con el correo al que se envió el código aunque el campo cambie', async () => {
    await llegarAlCodigo();
    componente.formularioCorreo.controls.correo.setValue('otra@correo.com');
    await fixture.whenStable();
    expect(texto()).toContain('ana@correo.com');

    llenarCodigo();
    componente.restablecer();
    const peticion = backend.expectOne(urlRestablecer);
    expect(peticion.request.body.correo).toBe('ana@correo.com');
    peticion.flush({ mensaje: 'Listo.' });
  });

  it('no permite usar otro correo mientras hay una petición en curso', async () => {
    await llegarAlCodigo();
    componente.pedirOtroCodigo();
    await fixture.whenStable();

    const boton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.boton-texto',
    );
    expect(boton?.disabled).toBe(true);

    componente.usarOtroCorreo();
    expect(componente.paso()).toBe('codigo');

    backend.expectOne(urlSolicitar).flush({ mensaje: 'Revisa tu correo.' });
    expect(componente.paso()).toBe('codigo');
  });

  it('bloquea el código y las contraseñas mientras se guarda', async () => {
    await llegarAlCodigo();
    llenarCodigo();
    componente.restablecer();
    await fixture.whenStable();

    for (const nombre of ['codigo', 'nuevaContrasena', 'confirmacion']) {
      const campo = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
        `input[formControlName="${nombre}"]`,
      );
      expect(campo, nombre).not.toBeNull();
      expect(campo?.readOnly, nombre).toBe(true);
    }

    componente.restablecer();
    componente.pedirOtroCodigo();
    backend.expectOne(urlRestablecer).flush({ mensaje: 'Listo.' });
  });

  it('ignora una segunda solicitud mientras la primera está en curso', async () => {
    await crear('ana@correo.com');
    componente.solicitarCodigo();
    componente.solicitarCodigo();

    backend.expectOne(urlSolicitar).flush({ mensaje: 'Revisa tu correo.' });
  });

  it('libera el formulario si el servidor no responde a tiempo', async () => {
    await llegarAlCodigo();
    llenarCodigo();
    vi.useFakeTimers();
    try {
      componente.restablecer();
      const peticion = backend.expectOne(urlRestablecer);
      vi.advanceTimersByTime(TIEMPO_ESPERA_RECUPERACION_MS);

      expect(peticion.cancelled).toBe(true);
      expect(componente.enviando()).toBe(false);
      expect(componente.codigoRechazado()).toBe(false);
      expect(componente.error()).toContain('tardó demasiado');
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancela la petición si el usuario sale de la pantalla', async () => {
    await crear('ana@correo.com');
    componente.solicitarCodigo();
    const peticion = backend.expectOne(urlSolicitar);

    fixture.destroy();

    expect(peticion.cancelled).toBe(true);
  });
});
