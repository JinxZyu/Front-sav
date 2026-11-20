import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Rol } from '../../../config/auth/sesion.models';
import { SesionService } from '../../../config/auth/sesion.service';
import { crearToken } from '../../../config/auth/sesion.testing';
import { notificacion } from '../../models/notificacion.testing';
import { NotificacionService } from '../../services/notificacion.service';
import { MisNotificaciones } from './mis-notificaciones';

describe('MisNotificaciones (HU-039)', () => {
  let fixture: ComponentFixture<MisNotificaciones>;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/notificaciones/mis-notificaciones`;

  const crear = (rol: Rol = 'HUESPED', vistasHasta?: string) => {
    localStorage.clear();
    if (vistasHasta) {
      localStorage.setItem(
        'marketplace.notificaciones.vistas.hugo@correo.com',
        String(new Date(vistasHasta).getTime()),
      );
    }
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(SesionService).iniciar(
      crearToken({ sub: 'hugo@correo.com', role: rol, exp: Math.floor(Date.now() / 1000) + 3600 }),
    );
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MisNotificaciones);
    fixture.detectChanges();
    TestBed.tick();
  };

  const responder = async (cuerpo: object, opciones?: { status: number; statusText: string }) => {
    backend.expectOne(url).flush(cuerpo, opciones);
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const items = () => [...elemento().querySelectorAll<HTMLLIElement>('.lista li')];

  afterEach(() => backend.verify());

  it('muestra un esqueleto mientras consulta', async () => {
    crear();
    expect(elemento().querySelector('[aria-busy="true"]')).not.toBeNull();
    await responder([]);
  });

  it('criterio 1: muestra las notificaciones propias con mensaje legible, fecha y enlace', async () => {
    crear();
    await responder([
      notificacion(),
      notificacion({
        idNotificacion: 'n-2',
        idReserva: null,
        tipo: 'PUBLICACION_ESTADO_CAMBIADO',
        mensaje: 'El estado de tu publicación cambió de ACTIVA a PAUSADA.',
      }),
    ]);

    expect(items().length).toBe(2);
    expect(items()[0].textContent).toContain('Pendiente de pago → Confirmada');
    expect(items()[0].querySelector('time')?.textContent).toContain('18 de nov');
    expect(items()[0].querySelector('a')?.getAttribute('href')).toBe('/reservas/r-1');
    expect(items()[1].querySelector('a')?.getAttribute('href')).toBe('/publicaciones/p-1');
  });

  it('al anfitrión lo lleva a las reservas y publicaciones de sus alojamientos', async () => {
    crear('ANFITRION');
    await responder([notificacion(), notificacion({ idNotificacion: 'n-2', idReserva: null })]);

    expect(items()[0].querySelector('a')?.getAttribute('href')).toBe('/reservas/alojamientos/r-1');
    expect(items()[1].querySelector('a')?.getAttribute('href')).toBe('/alojamientos/p-1');
  });

  it('criterio 2: muestra un estado vacío sin error', async () => {
    crear();
    await responder([]);

    expect(elemento().textContent).toContain('No tienes notificaciones');
    expect(elemento().querySelector('[role="alert"]')).toBeNull();
  });

  it('criterio 4: al actualizar incluye las notificaciones nuevas', async () => {
    crear();
    await responder([notificacion()]);

    elemento().querySelector<HTMLButtonElement>('.actualizar')!.click();
    TestBed.tick();
    await responder([notificacion({ idNotificacion: 'n-2' }), notificacion()]);

    expect(items().length).toBe(2);
  });

  it('marca como nuevas las que llegaron desde la última visita y las da por vistas', async () => {
    crear('HUESPED', '2026-11-18T09:00:00Z');
    await responder([
      notificacion(),
      notificacion({ idNotificacion: 'n-2', fechaCreacion: '2026-11-18T08:00:00Z' }),
    ]);

    expect(items()[0].querySelector('.etiqueta')?.textContent).toBe('Nueva');
    expect(items()[1].querySelector('.etiqueta')).toBeNull();
    TestBed.tick();
    expect(TestBed.inject(NotificacionService).nuevas()).toBe(0);
  });

  it('permite reintentar cuando falla la consulta', async () => {
    crear();
    await responder({}, { status: 500, statusText: 'Error' });
    elemento().querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    TestBed.tick();
    await responder([notificacion()]);

    expect(items().length).toBe(1);
  });
});
