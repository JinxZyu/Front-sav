import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { DetallePublicacion } from '../../models/alojamiento.models';
import { AccionesEstado } from './acciones-estado';

describe('AccionesEstado (HU-013)', () => {
  let fixture: ComponentFixture<AccionesEstado>;
  let backend: HttpTestingController;
  let cambios: string[];
  const url = `${environment.apiUrl}/publicaciones/p-1/enviar-revision`;

  const publicacion = (estado: string) =>
    ({ idPublicacion: 'p-1', estado }) as unknown as DetallePublicacion;

  const crear = async (estado: string) => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AccionesEstado);
    fixture.componentRef.setInput('publicacion', publicacion(estado));
    cambios = [];
    fixture.componentInstance.cambio.subscribe((estadoNuevo) => cambios.push(estadoNuevo));
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const boton = () => elemento().querySelector<HTMLButtonElement>('button');

  afterEach(() => backend.verify());

  it('criterio 1: envía un borrador a revisión y avisa el nuevo estado', async () => {
    await crear('BORRADOR');
    boton()?.click();
    await fixture.whenStable();

    expect(boton()?.disabled).toBe(true);
    expect(boton()?.textContent?.trim()).toBe('Enviando…');
    const peticion = backend.expectOne(url);
    expect(peticion.request.method).toBe('PATCH');
    peticion.flush({
      idPublicacion: 'p-1',
      estadoAnterior: 'BORRADOR',
      estadoActual: 'PENDIENTE_REVISION',
    });
    fixture.componentRef.setInput('publicacion', publicacion('PENDIENTE_REVISION'));
    await fixture.whenStable();

    expect(cambios).toEqual(['PENDIENTE_REVISION']);
    expect(elemento().querySelector('[role="status"]')?.textContent).toContain(
      'Enviamos tu publicación',
    );
    expect(elemento().textContent).toContain('Un administrador está revisando');
    expect(boton()).toBeNull();
  });

  it('no envía dos veces si se hace doble clic', async () => {
    await crear('BORRADOR');
    fixture.componentInstance.enviarRevision();
    fixture.componentInstance.enviarRevision();

    backend.expectOne(url).flush({ estadoActual: 'PENDIENTE_REVISION' });
  });

  it('criterio 3: muestra la información faltante y lleva a completarla', async () => {
    await crear('BORRADOR');
    boton()?.click();
    backend.expectOne(url).flush(
      {
        mensaje:
          'La publicación no puede enviarse a revisión. Información faltante o inválida: reglas, al menos una imagen.',
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();

    const alerta = elemento().querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('reglas, al menos una imagen');
    expect(alerta?.querySelector('a')?.getAttribute('href')).toBe('/alojamientos/p-1/editar');
    expect(cambios).toEqual([]);
    expect(boton()?.disabled).toBe(false);
  });

  it('criterio 2: muestra el rechazo por no ser el dueño sin enlace para completar', async () => {
    await crear('BORRADOR');
    boton()?.click();
    backend
      .expectOne(url)
      .flush(
        { mensaje: 'No puedes enviar a revisión una publicación que no te pertenece.' },
        { status: 403, statusText: 'Forbidden' },
      );
    await fixture.whenStable();

    const alerta = elemento().querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('no te pertenece');
    expect(alerta?.querySelector('a')).toBeNull();
  });

  it('criterio 4: una publicación bloqueada no ofrece enviarla a revisión', async () => {
    await crear('BLOQUEADA');

    expect(boton()).toBeNull();
    expect(elemento().textContent).toContain('bloqueó esta publicación');
  });

  it('informa cuando la publicación fue rechazada', async () => {
    await crear('RECHAZADA');

    expect(boton()).toBeNull();
    expect(elemento().textContent).toContain('rechazó esta publicación');
  });

  it('no muestra nada para una publicación activa', async () => {
    await crear('ACTIVA');

    expect(elemento().textContent?.trim()).toBe('');
  });
});
