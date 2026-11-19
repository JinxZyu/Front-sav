import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SesionService } from '../../config/auth/sesion.service';
import { crearToken } from '../../config/auth/sesion.testing';
import { environment } from '../../../environments/environment';
import { CuentaService } from './cuenta.service';

describe('CuentaService', () => {
  const url = `${environment.apiUrl}/usuarios/mi_cuenta`;
  let servicio: CuentaService;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(CuentaService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('consulta los datos de la cuenta del usuario en sesión', () => {
    let nombre = '';
    servicio.consultar().subscribe((cuenta) => (nombre = cuenta.nombre));
    const peticion = backend.expectOne(url);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ nombre: 'Sophia', apellido: 'Mora' });

    expect(nombre).toBe('Sophia');
  });

  it('criterio 2: no consulta la cuenta si no hay sesión', () => {
    TestBed.tick();
    backend.expectNone(url);
    expect(servicio.actual.hasValue()).toBe(false);
  });

  it('carga la cuenta al iniciar sesión y la olvida al cerrarla', async () => {
    const sesion = TestBed.inject(SesionService);
    sesion.iniciar(
      crearToken({ sub: 'a@b.co', role: 'HUESPED', exp: Math.floor(Date.now() / 1000) + 3600 }),
    );
    TestBed.tick();
    backend.expectOne(url).flush({ nombre: 'Sophia', apellido: 'Mora' });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(servicio.actual.value()?.nombre).toBe('Sophia');

    sesion.cerrar();
    TestBed.tick();
    expect(servicio.actual.hasValue()).toBe(false);
  });
});
