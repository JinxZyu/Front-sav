import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { PoliticaPublicacion } from './politica-publicacion';
import { AvisosService } from '../../../shared/services/avisos.service';

describe('PoliticaPublicacion (HU-019)', () => {
  let fixture: ComponentFixture<PoliticaPublicacion>;
  let backend: HttpTestingController;
  let guardados: number;
  const api = environment.apiUrl;
  const url = `${api}/publicaciones/p-1/politica-cancelacion`;
  const urlActivas = `${api}/politicas-cancelacion/activas`;

  const politica = (cambios: object = {}) => ({
    idPublicacion: 'p-1',
    idPolitica: 'pol-flex',
    nombre: 'Flexible',
    version: 1,
    descripcion: 'Cancela sin costo.',
    anticipacionHoras: 24,
    porcentajeDevolucion: 100,
    activa: true,
    ...cambios,
  });

  const activas = [
    {
      idPolitica: 'pol-flex',
      nombre: 'Flexible',
      version: 1,
      descripcion: null,
      anticipacionHoras: 24,
      porcentajeDevolucion: 100,
    },
    {
      idPolitica: 'pol-mod',
      nombre: 'Moderada',
      version: 1,
      descripcion: 'Devuelve la mitad.',
      anticipacionHoras: 72,
      porcentajeDevolucion: 50,
    },
    {
      idPolitica: 'pol-est',
      nombre: 'Estricta',
      version: 1,
      descripcion: null,
      anticipacionHoras: null,
      porcentajeDevolucion: null,
    },
  ];

  const crear = async (respuesta: object | null = politica(), editable = true) => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PoliticaPublicacion);
    fixture.componentRef.setInput('idPublicacion', 'p-1');
    fixture.componentRef.setInput('editable', editable);
    guardados = 0;
    fixture.componentInstance.guardado.subscribe(() => guardados++);
    fixture.detectChanges();
    TestBed.tick();
    if (respuesta) {
      backend.expectOne(url).flush(respuesta);
      await fixture.whenStable();
    }
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const botonPorTexto = (texto: string) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('button')].find(
      (boton) => boton.textContent?.trim() === texto,
    );

  const abrirEdicion = async () => {
    botonPorTexto('Cambiar')?.click();
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(urlActivas).flush(activas);
    await fixture.whenStable();
  };

  afterEach(() => backend.verify());

  it('criterio 4: muestra la política guardada con su devolución', async () => {
    await crear();

    const texto = elemento().textContent ?? '';
    expect(elemento().querySelector('.valor')?.textContent).toBe('Flexible');
    expect(texto).toContain('Cancela sin costo.');
    expect(texto).toContain('Devolución: 100 %');
    expect(texto).toContain('24 horas de anticipación');
  });

  it('criterio 1: cambia a otra de las políticas permitidas', async () => {
    await crear();
    await abrirEdicion();

    const radios = [...elemento().querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(radios.map((radio) => radio.value)).toEqual(['pol-flex', 'pol-mod', 'pol-est']);
    expect(radios[0].checked).toBe(true);
    radios[1].click();
    botonPorTexto('Guardar')?.click();

    const peticion = backend.expectOne(url);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({ idPolitica: 'pol-mod' });
    peticion.flush(politica({ idPolitica: 'pol-mod', nombre: 'Moderada', descripcion: null }));
    await fixture.whenStable();

    expect(elemento().querySelector('.valor')?.textContent).toBe('Moderada');
    expect(TestBed.inject(AvisosService).avisos().at(-1)?.detalle).toContain('Guardamos');
    expect(guardados).toBe(1);
  });

  it('cancelar vuelve a mostrar la política sin guardar', async () => {
    await crear();
    await abrirEdicion();
    botonPorTexto('Cancelar')?.click();
    await fixture.whenStable();

    expect(elemento().querySelector('.valor')?.textContent).toBe('Flexible');
    expect(elemento().querySelector('input')).toBeNull();
  });

  it('criterios 2 y 3: muestra el rechazo del servidor y deja seguir eligiendo', async () => {
    await crear();
    await abrirEdicion();
    elemento().querySelectorAll<HTMLInputElement>('input[type="radio"]')[2].click();
    botonPorTexto('Guardar')?.click();
    backend
      .expectOne(url)
      .flush(
        { mensaje: 'No tienes permisos para modificar esta publicación.' },
        { status: 403, statusText: 'Forbidden' },
      );
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('No tienes permisos');
    expect(elemento().querySelectorAll('input[type="radio"]')).toHaveLength(3);
    expect(guardados).toBe(0);
  });

  it('avisa si la política actual ya no está vigente', async () => {
    await crear(politica({ activa: false }));

    expect(elemento().textContent).toContain('ya no está vigente');
  });

  it('permite reintentar si falla la consulta', async () => {
    await crear(null);
    backend.expectOne(url).flush('Error', { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    botonPorTexto('Reintentar')?.click();
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(url).flush(politica());
    await fixture.whenStable();

    expect(elemento().querySelector('.valor')?.textContent).toBe('Flexible');
  });

  it('no ofrece cambiar la política si no es editable', async () => {
    await crear(politica(), false);

    expect(botonPorTexto('Cambiar')).toBeUndefined();
  });

  it('no deja guardar una política que no está entre las activas', async () => {
    await crear(politica({ idPolitica: 'pol-vieja', activa: false }));
    await abrirEdicion();

    const radios = [...elemento().querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(radios.some((radio) => radio.checked)).toBe(false);
    expect(botonPorTexto('Guardar')?.disabled).toBe(true);
    fixture.componentInstance.guardar();
    backend.expectNone(url);

    radios[1].click();
    fixture.detectChanges();
    expect(botonPorTexto('Guardar')?.disabled).toBe(false);
  });

  it('mantiene Cancelar cuando fallan las políticas disponibles', async () => {
    await crear();
    botonPorTexto('Cambiar')?.click();
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(urlActivas).flush('Error', { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(botonPorTexto('Reintentar')).toBeDefined();
    botonPorTexto('Cancelar')?.click();
    await fixture.whenStable();
    expect(elemento().querySelector('.valor')?.textContent).toBe('Flexible');
  });

  it('cierra la edición y no guarda si deja de ser editable', async () => {
    await crear();
    await abrirEdicion();
    elemento().querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();

    fixture.componentRef.setInput('editable', false);
    await fixture.whenStable();
    fixture.componentInstance.guardar();

    backend.expectNone(url);
    expect(elemento().querySelector('input')).toBeNull();
    expect(botonPorTexto('Cambiar')).toBeUndefined();
  });
});
