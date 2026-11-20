import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SesionService } from '../../config/auth/sesion.service';
import { crearToken } from '../../config/auth/sesion.testing';
import { notificacion } from '../models/notificacion.testing';
import { NotificacionService } from './notificacion.service';

describe('NotificacionService', () => {
  let servicio: NotificacionService;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/notificaciones/mis-notificaciones`;

  const entrarComo = (correo: string) =>
    TestBed.inject(SesionService).iniciar(
      crearToken({ sub: correo, role: 'HUESPED', exp: Math.floor(Date.now() / 1000) + 3600 }),
    );

  const consultar = (notificaciones = [notificacion()]) => {
    servicio.misNotificaciones().subscribe();
    backend.expectOne(url).flush(notificaciones);
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(NotificacionService);
    backend = TestBed.inject(HttpTestingController);
    entrarComo('ana@correo.com');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    backend.verify();
  });

  it('no muestra las notificaciones de otra cuenta después de cambiar de sesión', () => {
    consultar();
    expect(servicio.nuevas()).toBe(1);

    entrarComo('hugo@correo.com');
    expect(servicio.nuevas()).toBe(0);
  });

  it('marca como vistas solo las notificaciones recibidas', () => {
    consultar([notificacion({ fechaCreacion: '2026-11-18T10:00:00Z' })]);
    servicio.marcarVistas([notificacion({ fechaCreacion: '2026-11-18T10:00:00Z' })]);
    expect(servicio.nuevas()).toBe(0);

    consultar([
      notificacion({ idNotificacion: 'n-2', fechaCreacion: '2026-11-18T10:00:05Z' }),
      notificacion({ fechaCreacion: '2026-11-18T10:00:00Z' }),
    ]);
    expect(servicio.nuevas()).toBe(1);
  });

  it('conserva la marca en memoria cuando el navegador no permite guardarla', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Sin almacenamiento');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Sin almacenamiento');
    });

    consultar();
    servicio.marcarVistas([notificacion()]);
    expect(servicio.nuevas()).toBe(0);

    consultar();
    expect(servicio.nuevas()).toBe(0);
    expect(servicio.ultimaVista()).toBe(new Date('2026-11-18T10:00:00Z').getTime());
  });

  it('una respuesta antigua no reemplaza las notificaciones más recientes', () => {
    const antigua = notificacion({ fechaCreacion: '2026-11-18T10:00:00Z' });
    const reciente = notificacion({ idNotificacion: 'n-2', fechaCreacion: '2026-11-18T10:05:00Z' });
    const recibidasPorLaPagina: unknown[] = [];
    servicio.misNotificaciones().subscribe((lista) => recibidasPorLaPagina.push(lista));
    servicio.misNotificaciones().subscribe();
    const [primera, segunda] = backend.match(url);

    segunda.flush([reciente, antigua]);
    primera.flush([antigua]);
    servicio.marcarVistas([antigua]);

    expect(recibidasPorLaPagina).toEqual([[antigua]]);
    expect(servicio.nuevas()).toBe(1);
  });
});
