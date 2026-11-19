import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAX_IMAGENES, SelectorImagenes, TAMANO_MAXIMO_BYTES } from './selector-imagenes';

const FIRMAS: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff, 0xe0],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/webp': [...'RIFF']
    .map((c) => c.charCodeAt(0))
    .concat(
      [0, 0, 0, 0],
      [...'WEBP'].map((c) => c.charCodeAt(0)),
    ),
  'image/gif': [...'GIF89a'].map((c) => c.charCodeAt(0)),
};

const contenido = (firma: number[], tamano: number) => {
  const bytes = new Uint8Array(Math.max(tamano, firma.length));
  bytes.set(firma);
  return bytes;
};

const imagen = (nombre: string, tipo = 'image/jpeg', tamano = 16, firma = FIRMAS[tipo] ?? []) =>
  new File([contenido(firma, tamano)], nombre, { type: tipo });

@Component({
  imports: [SelectorImagenes],
  template: `<app-selector-imagenes [(archivos)]="archivos" [deshabilitado]="deshabilitado()" />`,
})
class Anfitrion {
  readonly archivos = signal<File[]>([]);
  readonly deshabilitado = signal(false);
}

describe('SelectorImagenes (HU-010)', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let crearUrl: ReturnType<typeof vi.fn>;
  let liberarUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    let contador = 0;
    crearUrl = vi.fn(() => `blob:imagen-${++contador}`);
    liberarUrl = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: crearUrl, revokeObjectURL: liberarUrl });
    fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
  });

  afterEach(() => vi.unstubAllGlobals());

  const elemento = () => fixture.nativeElement as HTMLElement;
  const selector = () => fixture.debugElement.children[0].componentInstance as SelectorImagenes;
  const seleccionar = async (archivos: File[]) => {
    const campo = elemento().querySelector<HTMLInputElement>('input[type="file"]');
    if (campo) {
      Object.defineProperty(campo, 'files', { value: archivos, configurable: true });
      campo.dispatchEvent(new Event('change'));
    }
    await fixture.whenStable();
  };

  it('agrega imágenes válidas y muestra sus vistas previas con la portada', async () => {
    await seleccionar([
      imagen('a.jpg'),
      imagen('b.png', 'image/png'),
      imagen('c.webp', 'image/webp'),
    ]);

    expect(fixture.componentInstance.archivos().map((archivo) => archivo.name)).toEqual([
      'a.jpg',
      'b.png',
      'c.webp',
    ]);
    const vistas = [...elemento().querySelectorAll('img')];
    expect(vistas.map((vista) => vista.getAttribute('src'))).toEqual([
      'blob:imagen-1',
      'blob:imagen-2',
      'blob:imagen-3',
    ]);
    expect(elemento().querySelectorAll('.portada')).toHaveLength(1);
    expect(elemento().textContent).toContain('(3/10)');
  });

  it('rechaza formatos no permitidos y archivos de más de 5 MB', async () => {
    await seleccionar([
      imagen('foto.gif', 'image/gif'),
      imagen('grande.jpg', 'image/jpeg', TAMANO_MAXIMO_BYTES + 1),
      imagen('bien.jpg'),
    ]);

    expect(fixture.componentInstance.archivos()).toHaveLength(1);
    const avisos = elemento().querySelector('[role="alert"]')?.textContent ?? '';
    expect(avisos).toContain('foto.gif: formato no permitido');
    expect(avisos).toContain('grande.jpg: supera los 5 MB');
  });

  it('no deja pasar de 10 imágenes', async () => {
    await seleccionar(Array.from({ length: MAX_IMAGENES + 2 }, (_, i) => imagen(`f${i}.jpg`)));

    expect(fixture.componentInstance.archivos()).toHaveLength(MAX_IMAGENES);
    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'ya tienes el máximo',
    );
    expect(elemento().querySelector<HTMLInputElement>('input[type="file"]')?.disabled).toBe(true);
  });

  it('acepta una imagen válida aunque el navegador no informe su tipo', async () => {
    await seleccionar([imagen('sin-tipo.webp', '', 16, FIRMAS['image/webp'])]);

    const [aceptada] = fixture.componentInstance.archivos();
    expect(aceptada.name).toBe('sin-tipo.webp');
    expect(aceptada.type).toBe('image/webp');
    expect(elemento().querySelector('[role="alert"]')).toBeNull();
  });

  it('rechaza archivos que no son imágenes aunque digan serlo o no traigan tipo', async () => {
    await seleccionar([
      imagen(
        'falsa.jpg',
        'image/jpeg',
        16,
        [...'hola'].map((c) => c.charCodeAt(0)),
      ),
      imagen('sin-tipo.bin', '', 16, []),
    ]);

    expect(fixture.componentInstance.archivos()).toEqual([]);
    const avisos = elemento().querySelector('[role="alert"]')?.textContent ?? '';
    expect(avisos).toContain('falsa.jpg: formato no permitido');
    expect(avisos).toContain('sin-tipo.bin: formato no permitido');
  });

  it('no agrega nada si se sale de la pantalla mientras revisa los archivos', async () => {
    const campo = elemento().querySelector<HTMLInputElement>('input[type="file"]');
    Object.defineProperty(campo, 'files', { value: [imagen('a.jpg')], configurable: true });
    campo?.dispatchEvent(new Event('change'));
    fixture.destroy();
    await new Promise((resolver) => setTimeout(resolver));

    expect(fixture.componentInstance.archivos()).toEqual([]);
    expect(crearUrl).not.toHaveBeenCalled();
  });

  it('quita una imagen y libera su vista previa', async () => {
    await seleccionar([imagen('a.jpg'), imagen('b.jpg')]);
    elemento().querySelector<HTMLButtonElement>('button[aria-label="Quitar a.jpg"]')?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.archivos().map((archivo) => archivo.name)).toEqual(['b.jpg']);
    expect(liberarUrl).toHaveBeenCalledWith('blob:imagen-1');
  });

  it('libera las vistas previas si el formulario se reinicia o se sale de la pantalla', async () => {
    await seleccionar([imagen('a.jpg'), imagen('b.jpg')]);
    fixture.componentInstance.archivos.set([]);
    await fixture.whenStable();
    expect(liberarUrl).toHaveBeenCalledTimes(2);

    await seleccionar([imagen('c.jpg')]);
    fixture.destroy();
    expect(liberarUrl).toHaveBeenCalledTimes(3);
  });

  it('acepta imágenes arrastradas y marca la zona mientras se arrastra', async () => {
    const zona = elemento().querySelector<HTMLElement>('.zona');
    zona?.dispatchEvent(new Event('dragover', { cancelable: true }));
    await fixture.whenStable();
    expect(zona?.classList.contains('arrastrando')).toBe(true);

    const soltar = new Event('drop', { cancelable: true }) as DragEvent;
    Object.defineProperty(soltar, 'dataTransfer', { value: { files: [imagen('arrastrada.jpg')] } });
    zona?.dispatchEvent(soltar);
    await fixture.whenStable();

    expect(soltar.defaultPrevented).toBe(true);
    expect(zona?.classList.contains('arrastrando')).toBe(false);
    expect(fixture.componentInstance.archivos()[0].name).toBe('arrastrada.jpg');
  });

  it('no cambia nada mientras está deshabilitado', async () => {
    await seleccionar([imagen('a.jpg')]);
    fixture.componentInstance.deshabilitado.set(true);
    await fixture.whenStable();

    selector().quitar(fixture.componentInstance.archivos()[0]);
    const soltar = new Event('drop', { cancelable: true }) as DragEvent;
    Object.defineProperty(soltar, 'dataTransfer', { value: { files: [imagen('b.jpg')] } });
    selector().alSoltar(soltar);
    selector().alArrastrar(new Event('dragover', { cancelable: true }) as DragEvent);

    expect(fixture.componentInstance.archivos()).toHaveLength(1);
    expect(selector().arrastrando()).toBe(false);
  });
});
