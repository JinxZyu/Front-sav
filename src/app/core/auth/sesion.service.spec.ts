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
});
