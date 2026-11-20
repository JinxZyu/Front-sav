import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ResenaPublica } from '../../../resena/models/resena.models';
import { AvisosService } from '../../../shared/services/avisos.service';
import { ModeracionResenas } from './moderacion-resenas';

describe('ModeracionResenas (HU-042)', () => {
  let fixture: ComponentFixture<ModeracionResenas>;
  let backend: HttpTestingController;
  const lista = `${environment.apiUrl}/publicaciones/p-1/resenas`;
  const ocultar = (idResena: string) =>
    `${environment.apiUrl}/administracion/resenas/${idResena}/ocultar`;

  const resenas: ResenaPublica[] = [
    {
      idResena: 'rs-1',
      calificacion: 1,
      comentario: 'Comentario con insultos',
      fechaPublicacion: '2026-11-18T15:00:00Z',
    },
    {
      idResena: 'rs-2',
      calificacion: 5,
      comentario: 'Excelente estadía',
      fechaPublicacion: '2026-11-17T15:00:00Z',
    },
  ];

  const crear = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ModeracionResenas);
    fixture.componentRef.setInput('idPublicacion', 'p-1');
    fixture.detectChanges();
    TestBed.tick();
  };

  const responder = async (
    lista$: ResenaPublica[] = resenas,
    opciones?: { status: number; statusText: string },
  ) => {
    backend.expectOne(lista).flush(
      opciones
        ? { mensaje: 'La publicación no existe.' }
        : {
            idPublicacion: 'p-1',
            resenas: lista$,
            totalResenas: lista$.length,
            calificacionPromedio: 3,
            mensaje: null,
          },
      opciones,
    );
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const items = () => [...elemento().querySelectorAll<HTMLElement>('li')];
  const boton = (contenedor: HTMLElement, texto: string) =>
    [...contenedor.querySelectorAll<HTMLButtonElement>('button')].find((item) =>
      item.textContent?.trim().startsWith(texto),
    ) as HTMLButtonElement;
  const escribirYEnviar = (contenedor: HTMLElement, texto: string) => {
    const campo = contenedor.querySelector('textarea') as HTMLTextAreaElement;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    contenedor.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  afterEach(() => backend.verify());

  it('avisa mientras consulta', async () => {
    crear();
    expect(elemento().querySelector('[aria-busy="true"]')).not.toBeNull();
    await responder();
  });

  it('muestra las reseñas visibles con su calificación, fecha y comentario', async () => {
    crear();
    await responder();

    expect(items()).toHaveLength(2);
    expect(items()[0].querySelector('app-estrellas')?.getAttribute('aria-label')).toBe(
      '1 de 5 estrellas',
    );
    expect(items()[0].textContent).toContain('18 de nov de 2026');
    expect(items()[0].textContent).toContain('Comentario con insultos');
  });

  it('criterio 1: oculta la reseña con el motivo y la quita del listado', async () => {
    crear();
    await responder();
    const mostrar = vi.spyOn(TestBed.inject(AvisosService), 'mostrar');

    boton(items()[0], 'Ocultar').click();
    fixture.detectChanges();
    expect(items()[0].querySelector('label')?.textContent).toContain('Motivo para ocultarla');
    expect(boton(items()[1], 'Ocultar')).toBeDefined();
    escribirYEnviar(items()[0], 'Lenguaje ofensivo');

    const peticion = backend.expectOne(ocultar('rs-1'));
    expect(peticion.request.body).toEqual({ motivo: 'Lenguaje ofensivo' });
    expect(boton(items()[1], 'Ocultar').disabled).toBe(true);
    peticion.flush({ mensaje: 'La reseña fue ocultada correctamente.' });
    fixture.detectChanges();

    expect(mostrar).toHaveBeenCalledWith(
      'Reseña ocultada',
      'La reseña fue ocultada correctamente.',
    );
    await responder([resenas[1]]);
    expect(items()).toHaveLength(1);
    expect(elemento().textContent).not.toContain('Comentario con insultos');
  });

  it('criterio 3: informa si la reseña ya no puede modificarse', async () => {
    crear();
    await responder();

    boton(items()[0], 'Ocultar').click();
    fixture.detectChanges();
    escribirYEnviar(items()[0], 'Spam');
    backend
      .expectOne(ocultar('rs-1'))
      .flush(
        { mensaje: 'La reseña ya está oculta y no puede modificarse.' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(items()[0].querySelector('[role="alert"]')?.textContent).toContain(
      'La reseña ya está oculta y no puede modificarse.',
    );
  });

  it('cancelar cierra el formulario', async () => {
    crear();
    await responder();

    boton(items()[0], 'Ocultar').click();
    fixture.detectChanges();
    boton(items()[0], 'Cancelar').click();
    fixture.detectChanges();

    expect(items()[0].querySelector('form')).toBeNull();
  });

  it('avisa cuando no hay reseñas visibles', async () => {
    crear();
    await responder([]);
    expect(elemento().textContent).toContain('Esta publicación no tiene reseñas visibles.');
  });

  it('si falla la consulta permite reintentar', async () => {
    crear();
    await responder([], { status: 500, statusText: 'Error' });

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'La publicación no existe.',
    );
    boton(elemento(), 'Reintentar').click();
    fixture.detectChanges();
    await responder();
    expect(items()).toHaveLength(2);
  });
});
