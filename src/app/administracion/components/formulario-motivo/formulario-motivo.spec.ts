import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormularioMotivo } from './formulario-motivo';

describe('FormularioMotivo', () => {
  let fixture: ComponentFixture<FormularioMotivo>;
  let confirmado: string[];
  let cancelado: number;

  const crear = async (entradas: Record<string, unknown> = {}) => {
    fixture = TestBed.createComponent(FormularioMotivo);
    const valores = {
      etiqueta: 'Motivo de la restricción',
      accion: 'Restringir cuenta',
      accionEnCurso: 'Restringiendo…',
      maximo: 10,
      ...entradas,
    };
    for (const [nombre, valor] of Object.entries(valores)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    confirmado = [];
    cancelado = 0;
    fixture.componentInstance.confirmar.subscribe((motivo) => confirmado.push(motivo));
    fixture.componentInstance.cancelar.subscribe(() => cancelado++);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const campo = () => elemento().querySelector('textarea') as HTMLTextAreaElement;
  const escribir = async (texto: string) => {
    campo().value = texto;
    campo().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const enviar = async () => {
    elemento().querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('muestra la etiqueta asociada al campo y lo enfoca', async () => {
    await crear();
    const etiqueta = elemento().querySelector('label') as HTMLLabelElement;
    expect(etiqueta.textContent?.trim()).toBe('Motivo de la restricción');
    expect(etiqueta.htmlFor).toBe(campo().id);
    expect(document.activeElement).toBe(campo());
  });

  it('pide el motivo si se envía vacío o solo con espacios', async () => {
    await crear();
    await escribir('   ');
    await enviar();

    expect(confirmado).toEqual([]);
    expect(campo().getAttribute('aria-invalid')).toBe('true');
    expect(elemento().textContent).toContain('Escribe el motivo.');
  });

  it('no deja enviar un motivo más largo que el máximo', async () => {
    await crear();
    await escribir('Demasiado largo');
    await enviar();

    expect(confirmado).toEqual([]);
    expect(elemento().textContent).toContain('15 de 10 caracteres');
    expect(campo().getAttribute('aria-invalid')).toBe('true');
  });

  it('emite el motivo sin espacios sobrantes', async () => {
    await crear();
    await escribir('  Fraude  ');
    expect(elemento().textContent).toContain('6 de 10 caracteres');
    await enviar();

    expect(confirmado).toEqual(['Fraude']);
  });

  it('mientras envía bloquea los botones, cambia el texto y no vuelve a emitir', async () => {
    await crear({ enviando: true });
    await escribir('Fraude');
    await enviar();

    const botones = [...elemento().querySelectorAll('button')];
    expect(botones.every((boton) => boton.disabled)).toBe(true);
    expect(botones[0].textContent?.trim()).toBe('Restringiendo…');
    expect(confirmado).toEqual([]);
  });

  it('muestra el error recibido', async () => {
    await crear({ error: 'La cuenta ya tiene una restricción administrativa.' });
    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'La cuenta ya tiene una restricción administrativa.',
    );
  });

  it('avisa al cancelar', async () => {
    await crear();
    (elemento().querySelector('button.secundario') as HTMLButtonElement).click();
    expect(cancelado).toBe(1);
  });
});
