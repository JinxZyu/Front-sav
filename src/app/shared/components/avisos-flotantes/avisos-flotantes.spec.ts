import { TestBed } from '@angular/core/testing';
import { AvisosService } from '../../services/avisos.service';
import { AvisosFlotantes } from './avisos-flotantes';

describe('AvisosFlotantes', () => {
  it('muestra los avisos y permite cerrarlos', async () => {
    const fixture = TestBed.createComponent(AvisosFlotantes);
    const avisos = TestBed.inject(AvisosService);
    const elemento = fixture.nativeElement as HTMLElement;

    avisos.mostrar('Publicación creada', 'Quedó en borrador.');
    await fixture.whenStable();

    expect(elemento.querySelector('[role="status"]')?.textContent).toContain('Publicación creada');
    expect(elemento.textContent).toContain('Quedó en borrador.');

    elemento.querySelector<HTMLButtonElement>('button[aria-label="Cerrar aviso"]')?.click();
    await fixture.whenStable();
    expect(elemento.querySelector('.aviso')).toBeNull();
  });
});
