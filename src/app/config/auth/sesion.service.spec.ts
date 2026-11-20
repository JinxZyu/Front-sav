import { TestBed } from '@angular/core/testing';
import { SesionService } from './sesion.service';
import { crearToken } from './sesion.testing';

const enUnaHora = () => Math.floor(Date.now() / 1000) + 3600;

describe('SesionService', () => {
  let servicio: SesionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(SesionService);
  });

  it('empieza sin sesión', () => {
    expect(servicio.autenticado()).toBe(false);
    expect(servicio.rol()).toBeNull();
    expect(servicio.correo()).toBeNull();
  });

  it('inicia sesión y lee el rol y el correo del token', () => {
    servicio.iniciar(crearToken({ sub: 'ana@correo.com', role: 'ANFITRION', exp: enUnaHora() }));

    expect(servicio.autenticado()).toBe(true);
    expect(servicio.rol()).toBe('ANFITRION');
    expect(servicio.correo()).toBe('ana@correo.com');
    expect(localStorage.getItem('marketplace.token')).not.toBeNull();
  });

  it('cierra sesión y borra el token', () => {
    servicio.iniciar(crearToken({ sub: 'ana@correo.com', role: 'HUESPED', exp: enUnaHora() }));
    servicio.cerrar();

    expect(servicio.autenticado()).toBe(false);
    expect(localStorage.getItem('marketplace.token')).toBeNull();
  });

  it('recupera la sesión guardada al recargar la página', () => {
    localStorage.setItem(
      'marketplace.token',
      crearToken({ sub: 'ana@correo.com', role: 'HUESPED', exp: enUnaHora() }),
    );
    TestBed.resetTestingModule();
    const nuevo = TestBed.inject(SesionService);

    expect(nuevo.autenticado()).toBe(true);
  });

  it('tieneRol compara con los roles permitidos', () => {
    expect(servicio.tieneRol('HUESPED')).toBe(false);

    servicio.iniciar(crearToken({ sub: 'a@b.co', role: 'ADMINISTRADOR', exp: enUnaHora() }));

    expect(servicio.tieneRol('ADMINISTRADOR')).toBe(true);
    expect(servicio.tieneRol('HUESPED', 'ANFITRION')).toBe(false);
  });

  it('reconoce al auditor de operación', () => {
    servicio.iniciar(crearToken({ sub: 'a@b.co', role: 'AUDITOR_OPERACION', exp: enUnaHora() }));

    expect(servicio.rol()).toBe('AUDITOR_OPERACION');
    expect(servicio.tieneRol('AUDITOR_OPERACION')).toBe(true);
    expect(servicio.tieneRol('ADMINISTRADOR')).toBe(false);
  });

  it('ignora un token vencido', () => {
    servicio.iniciar(crearToken({ sub: 'a@b.co', role: 'HUESPED', exp: 1 }));
    expect(servicio.autenticado()).toBe(false);
  });

  it('ignora un token con formato inválido', () => {
    servicio.iniciar('no-es-un-jwt');
    expect(servicio.autenticado()).toBe(false);
  });

  it('ignora un token cuyo contenido no es JSON', () => {
    servicio.iniciar('a.%%%.c');
    expect(servicio.autenticado()).toBe(false);
  });

  it('deja de estar autenticado cuando el token vence durante el uso', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      servicio.iniciar(
        crearToken({ sub: 'a@b.co', role: 'HUESPED', exp: Math.floor(Date.now() / 1000) + 60 }),
      );
      expect(servicio.autenticado()).toBe(true);

      vi.setSystemTime(Date.now() + 61_000);

      expect(servicio.autenticado()).toBe(false);
      expect(servicio.rol()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['sin vencimiento', { sub: 'a@b.co', role: 'HUESPED' }],
    ['vencimiento que no es número', { sub: 'a@b.co', role: 'HUESPED', exp: 'mañana' }],
    ['sin correo', { role: 'HUESPED', exp: enUnaHora() }],
    ['correo vacío', { sub: '', role: 'HUESPED', exp: enUnaHora() }],
    ['rol desconocido', { sub: 'a@b.co', role: 'SUPERUSUARIO', exp: enUnaHora() }],
    ['rol que no es texto', { sub: 'a@b.co', role: 1, exp: enUnaHora() }],
  ])('rechaza un token %s', (_caso, datos) => {
    servicio.iniciar(crearToken(datos));
    expect(servicio.autenticado()).toBe(false);
  });

  it('rechaza un token cuyo contenido no es un objeto', () => {
    servicio.iniciar(`a.${btoa('123')}.c`);
    expect(servicio.autenticado()).toBe(false);
  });

  it('rechaza un token cuyo contenido es null', () => {
    servicio.iniciar(`a.${btoa('null')}.c`);
    expect(servicio.autenticado()).toBe(false);
  });

  it('lee correctamente un correo con tildes', () => {
    servicio.iniciar(
      crearToken({ sub: 'josé.núñez@correo.com', role: 'HUESPED', exp: enUnaHora() }),
    );
    expect(servicio.correo()).toBe('josé.núñez@correo.com');
  });
});
