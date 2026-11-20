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
  let rol = 'HUESPED';
  let fixture: ComponentFixture<CampanaNotificaciones>;
  let backend: HttpTestingController;
  const url = `${environment.apiUrl}/notificaciones/mis-notificaciones`;

  const preparar = async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
      ],
    });
    TestBed.inject(SesionService).iniciar(
      crearToken({
        sub: 'ana@correo.com',
        role: rol,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CampanaNotificaciones);
    fixture.detectChanges();
    await new Promise((resolver) => setTimeout(resolver));
  };

  const lista = (cantidad: number) =>
    Array.from({ length: cantidad }, (_, indice) =>
      notificacion({ idNotificacion: `n-${indice}` }),
    );

  const crear = async (cantidad: number) => {
    await preparar();
    backend.expectOne(url).flush(lista(cantidad));
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const enlace = () => elemento().querySelector('button.campana') as HTMLButtonElement;
  const abrir = async () => {
    enlace().click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const panel = () => elemento().querySelector('#panel-notificaciones') as HTMLElement | null;

  afterEach(() => {
    rol = 'HUESPED';
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
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CampanaNotificaciones);
    fixture.detectChanges();
    await new Promise((resolver) => setTimeout(resolver));
    backend.expectOne(url).flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(enlace().querySelector('.contador')).toBeNull();
  });

  it('abre una lista con las notificaciones más recientes y las marca como vistas', async () => {
    await crear(7);
    expect(enlace().getAttribute('aria-expanded')).toBe('false');

    await abrir();

    expect(enlace().getAttribute('aria-expanded')).toBe('true');
    const items = [...(panel()?.querySelectorAll('li') ?? [])];
    expect(items).toHaveLength(5);
    expect(items.every((item) => item.classList.contains('nueva'))).toBe(true);
    expect(items[0].textContent).toContain('Tu reserva cambió de estado');
    expect(items[0].querySelector('a')?.getAttribute('href')).toBe('/reservas/r-1');
    const todas = panel()?.querySelector('a.todas') as HTMLAnchorElement;
    expect(todas.getAttribute('href')).toBe('/notificaciones');
    expect(todas.textContent).toContain('Ver todas las notificaciones');
    expect(enlace().querySelector('.contador')).toBeNull();
  });

  it('al administrador lo lleva a la revisión de la publicación', async () => {
    rol = 'ADMINISTRADOR';
    await crear(1);

    await abrir();

    expect(panel()?.querySelector('li a')?.getAttribute('href')).toBe(
      '/administracion/publicaciones/p-1',
    );
  });

  it('avisa cuando no hay notificaciones', async () => {
    await crear(0);
    await abrir();
    expect(panel()?.textContent).toContain('No tienes notificaciones.');
    expect(panel()?.querySelector('a.todas')?.textContent).toContain('Abrir notificaciones');
  });

  it('se cierra al elegir un enlace, con Escape, al hacer clic afuera o con la campana', async () => {
    await crear(1);

    await abrir();
    (panel()?.querySelector('a.todas') as HTMLAnchorElement).click();
    fixture.detectChanges();
    expect(panel()).toBeNull();

    await abrir();
    enlace().focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(enlace());

    await abrir();
    document.body.click();
    fixture.detectChanges();
    expect(panel()).toBeNull();

    await abrir();
    await abrir();
    expect(panel()).toBeNull();
  });

  it('Escape con la lista cerrada no hace nada', async () => {
    await crear(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('si se abre antes de la respuesta marca como vistas las que llegan con la lista abierta', async () => {
    await preparar();
    enlace().click();
    fixture.detectChanges();
    expect(panel()?.textContent).toContain('Cargando notificaciones');

    backend.expectOne(url).flush(lista(2));
    await fixture.whenStable();
    fixture.detectChanges();

    const items = [...(panel()?.querySelectorAll('li') ?? [])];
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.classList.contains('nueva'))).toBe(true);
    expect(enlace().querySelector('.contador')).toBeNull();
  });

  it('si falla la carga lo indica y permite reintentar', async () => {
    await preparar();
    backend.expectOne(url).flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    await abrir();
    expect(panel()?.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos cargar tus notificaciones.',
    );
    expect(panel()?.textContent).not.toContain('Cargando notificaciones');

    (panel()?.querySelector('button.reintentar') as HTMLButtonElement).click();
    backend.expectOne(url).flush(lista(1));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(panel()?.querySelector('[role="alert"]')).toBeNull();
    expect(panel()?.querySelectorAll('li')).toHaveLength(1);
  });
});
