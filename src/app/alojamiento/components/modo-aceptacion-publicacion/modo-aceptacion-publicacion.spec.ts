import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ModoAceptacionPublicacion } from './modo-aceptacion-publicacion';
import { AvisosService } from '../../../shared/services/avisos.service';

describe('ModoAceptacionPublicacion (HU-021)', () => {
  let fixture: ComponentFixture<ModoAceptacionPublicacion>;
  let backend: HttpTestingController;
  let guardados: number;
  const url = `${environment.apiUrl}/publicaciones/p-1/modo-aceptacion`;

  const crear = async (
    respuesta: object | null = { idPublicacion: 'p-1', modoAceptacion: 'INMEDIATA' },
    editable = true,
  ) => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ModoAceptacionPublicacion);
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

  afterEach(() => backend.verify());

  it('criterio 3: muestra el modo vigente', async () => {
    await crear();

    expect(elemento().querySelector('.valor')?.textContent).toBe('Reserva inmediata');
    expect(elemento().textContent).toContain('se confirman en cuanto el huésped paga');
  });

  it('criterio 2: cambia a reservas con aprobación', async () => {
    await crear();
    botonPorTexto('Cambiar')?.click();
    await fixture.whenStable();

    const radios = elemento().querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios[0].checked).toBe(true);
    radios[1].click();
    botonPorTexto('Guardar')?.click();

    const peticion = backend.expectOne(url);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({ modoAceptacion: 'APROBACION' });
    peticion.flush({ idPublicacion: 'p-1', modoAceptacion: 'APROBACION' });
    await fixture.whenStable();

    expect(elemento().querySelector('.valor')?.textContent).toBe('Con mi aprobación');
    expect(TestBed.inject(AvisosService).avisos().at(-1)?.detalle).toContain('Guardamos');
    expect(guardados).toBe(1);
  });

  it('criterio 1: cambia a reserva inmediata', async () => {
    await crear({ idPublicacion: 'p-1', modoAceptacion: 'APROBACION' });
    botonPorTexto('Cambiar')?.click();
    await fixture.whenStable();
    elemento().querySelectorAll<HTMLInputElement>('input[type="radio"]')[0].click();
    botonPorTexto('Guardar')?.click();

    const peticion = backend.expectOne(url);
    expect(peticion.request.body).toEqual({ modoAceptacion: 'INMEDIATA' });
    peticion.flush({ idPublicacion: 'p-1', modoAceptacion: 'INMEDIATA' });
  });

  it('criterio 4: muestra el rechazo y no cambia el modo', async () => {
    await crear();
    botonPorTexto('Cambiar')?.click();
    await fixture.whenStable();
    elemento().querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();
    botonPorTexto('Guardar')?.click();
    backend
      .expectOne(url)
      .flush({ mensaje: 'No tienes permisos.' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('No tienes permisos');
    botonPorTexto('Cancelar')?.click();
    await fixture.whenStable();
    expect(elemento().querySelector('.valor')?.textContent).toBe('Reserva inmediata');
    expect(guardados).toBe(0);
  });

  it('avisa si no hay un modo elegido y permite reintentar la consulta', async () => {
    await crear(null, false);
    backend.expectOne(url).flush('Error', { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    botonPorTexto('Reintentar')?.click();
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(url).flush({ idPublicacion: 'p-1', modoAceptacion: null });
    await fixture.whenStable();

    expect(elemento().textContent).toContain('Aún no has elegido');
    expect(botonPorTexto('Cambiar')).toBeUndefined();
  });

  it('cierra la edición y no guarda si deja de ser editable', async () => {
    await crear();
    botonPorTexto('Cambiar')?.click();
    await fixture.whenStable();
    elemento().querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();

    fixture.componentRef.setInput('editable', false);
    await fixture.whenStable();
    fixture.componentInstance.guardar();

    backend.expectNone(url);
    expect(elemento().querySelector('input')).toBeNull();
    expect(botonPorTexto('Cambiar')).toBeUndefined();
  });
});
