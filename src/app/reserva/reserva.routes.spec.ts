import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../environments/environment';
import { Rol } from '../config/auth/sesion.models';
import { SesionService } from '../config/auth/sesion.service';
import { crearToken } from '../config/auth/sesion.testing';
import { RESERVA_ROUTES } from './reserva.routes';

describe('Rutas de reservas', () => {
  const abrir = async (rol: Rol, url: string) => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'reservas', children: RESERVA_ROUTES },
          { path: '**', children: [] },
        ]),
      ],
    });
    TestBed.inject(SesionService).iniciar(
      crearToken({ sub: 'u@correo.com', role: rol, exp: Math.floor(Date.now() / 1000) + 3600 }),
    );
    await RouterTestingHarness.create(url);
    return TestBed.inject(HttpTestingController);
  };

  it('el anfitrión llega a las reservas de sus alojamientos', async () => {
    const backend = await abrir('ANFITRION', '/reservas/alojamientos');
    expect(TestBed.inject(Router).url).toBe('/reservas/alojamientos');
    backend.expectOne(`${environment.apiUrl}/reservas/mis-alojamientos`).flush({ reservas: [] });
  });

  it('el huésped llega a sus reservas', async () => {
    const backend = await abrir('HUESPED', '/reservas');
    expect(TestBed.inject(Router).url).toBe('/reservas');
    backend.expectOne(`${environment.apiUrl}/reservas/mis-reservas`).flush({ reservas: [] });
  });

  it('el huésped no entra a las reservas de un anfitrión', async () => {
    await abrir('HUESPED', '/reservas/alojamientos');
    expect(TestBed.inject(Router).url).toBe('/publicaciones');
  });
});
