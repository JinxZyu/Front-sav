import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SesionService } from '../../../config/auth/sesion.service';
import { crearToken } from '../../../config/auth/sesion.testing';
import { notificacion } from '../../models/notificacion.testing';
import { CampanaNotificaciones } from './campana-notificaciones';

describe('CampanaNotificaciones (HU-038)', () => {
  let fixture: ComponentFixture<CampanaNotificaciones>;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/notificaciones/mis-notificaciones`;

  const crear = async (cantidad: number) => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(SesionService).iniciar(
      crearToken({
        sub: 'ana@correo.com',
        role: 'HUESPED',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CampanaNotificaciones);
    fixture.detectChanges();
    await new Promise((resolver) => setTimeout(resolver));
    backend
      .expectOne(url)
      .flush(
        Array.from({ length: cantidad }, (_, indice) =>
          notificacion({ idNotificacion: `n-${indice}` }),
        ),
      );
    await fixture.whenStable();
  };

  const enlace = () => fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

  afterEach(() => {
    fixture.destroy();
    backend.verify();
  });

  it('sin notificaciones nuevas no muestra contador', async () => {
    await crear(0);
    expect(enlace().getAttribute('aria-label')).toBe('Notificaciones');
    expect(enlace().querySelector('.contador')).toBeNull();
  });

  it('resume más de nueve notificaciones nuevas', async () => {
    await crear(12);
    expect(enlace().getAttribute('aria-label')).toBe('Notificaciones, 12 nuevas');
    expect(enlace().querySelector('.contador')?.textContent?.trim()).toBe('9+');
  });

  it('si la consulta falla mantiene la campana sin contador', async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CampanaNotificaciones);
    fixture.detectChanges();
    await new Promise((resolver) => setTimeout(resolver));
    backend.expectOne(url).flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(enlace().querySelector('.contador')).toBeNull();
  });
});
