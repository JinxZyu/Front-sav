import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ImagenPublicacion } from './imagen-publicacion';

describe('ImagenPublicacion', () => {
  let fixture: ComponentFixture<ImagenPublicacion>;
  let backend: HttpTestingController;
  let revocar: ReturnType<typeof vi.fn>;
  let contador = 0;
  const api = environment.apiUrl;

  beforeEach(() => {
    revocar = vi.fn();
    contador = 0;
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => `blob:${++contador}`,
      revokeObjectURL: revocar,
    });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ImagenPublicacion);
    fixture.componentRef.setInput('ruta', '/imagenes/publicaciones/a.jpg');
    fixture.componentRef.setInput('descripcion', 'Sala');
    fixture.detectChanges();
    TestBed.tick();
  });

  afterEach(() => {
    backend.verify();
    vi.unstubAllGlobals();
  });

  const elemento = () => fixture.nativeElement as HTMLElement;

  it('carga la imagen con la sesión y la muestra', async () => {
    expect(elemento().querySelector('.cargando')).not.toBeNull();
    backend.expectOne(`${api}/imagenes/publicaciones/a.jpg`).flush(new Blob(['a']));
    await fixture.whenStable();

    const imagen = elemento().querySelector('img');
    expect(imagen?.getAttribute('src')).toBe('blob:1');
    expect(imagen?.alt).toBe('Sala');
  });

  it('libera la imagen anterior al cambiar de ruta y al destruirse', async () => {
    backend.expectOne(`${api}/imagenes/publicaciones/a.jpg`).flush(new Blob(['a']));
    await fixture.whenStable();

    fixture.componentRef.setInput('ruta', '/imagenes/publicaciones/b.jpg');
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(`${api}/imagenes/publicaciones/b.jpg`).flush(new Blob(['b']));
    await fixture.whenStable();
    expect(revocar).toHaveBeenCalledWith('blob:1');

    fixture.destroy();
    expect(revocar).toHaveBeenCalledWith('blob:2');
  });

  it('avisa si la imagen llega pero no se puede mostrar y reintenta con otra ruta', async () => {
    backend.expectOne(`${api}/imagenes/publicaciones/a.jpg`).flush(new Blob(['corrupta']));
    await fixture.whenStable();
    elemento().querySelector('img')?.dispatchEvent(new Event('error'));
    await fixture.whenStable();

    expect(elemento().querySelector('img')).toBeNull();
    expect(elemento().querySelector('.aviso')?.getAttribute('aria-label')).toBe(
      'No se pudo cargar: Sala',
    );
    expect(revocar).not.toHaveBeenCalled();

    fixture.componentRef.setInput('ruta', '/imagenes/publicaciones/b.jpg');
    fixture.detectChanges();
    TestBed.tick();
    backend.expectOne(`${api}/imagenes/publicaciones/b.jpg`).flush(new Blob(['b']));
    await fixture.whenStable();

    expect(elemento().querySelector('img')?.getAttribute('src')).toBe('blob:2');
    expect(revocar).toHaveBeenCalledWith('blob:1');
  });

  it('avisa si la imagen no se pudo cargar', async () => {
    backend
      .expectOne(`${api}/imagenes/publicaciones/a.jpg`)
      .flush(new Blob(['x']), { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(elemento().querySelector('img')).toBeNull();
    expect(elemento().querySelector('.aviso')?.getAttribute('aria-label')).toBe(
      'No se pudo cargar: Sala',
    );
  });

  it('muestra directo las imágenes guardadas en internet, sin pedirlas al backend', async () => {
    backend.expectOne(`${api}/imagenes/publicaciones/a.jpg`).flush(new Blob(['a']));
    await fixture.whenStable();
    const externa = 'https://res.cloudinary.com/demo/image/upload/v1/sav/foto.jpg';
    fixture.componentRef.setInput('ruta', externa);
    await fixture.whenStable();

    const imagen = elemento().querySelector('img');
    expect(imagen?.getAttribute('src')).toBe(externa);
    expect(imagen?.getAttribute('loading')).toBe('lazy');
    expect(revocar).toHaveBeenCalledWith('blob:1');

    imagen?.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(elemento().querySelector('img')).toBeNull();
    expect(elemento().querySelector('.aviso')).not.toBeNull();

    fixture.componentRef.setInput(
      'ruta',
      'https://res.cloudinary.com/demo/image/upload/v1/sav/otra.jpg',
    );
    await fixture.whenStable();
    expect(elemento().querySelector('img')?.getAttribute('src')).toContain('otra.jpg');
  });
});
