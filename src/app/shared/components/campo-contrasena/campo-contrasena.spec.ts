import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CampoContrasena } from './campo-contrasena';

@Component({
  imports: [CampoContrasena],
  template: `<app-campo-contrasena><input #campo type="password" /></app-campo-contrasena>`,
})
class Anfitrion {}

describe('CampoContrasena', () => {
  const crear = async () => {
    const fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      campo: elemento.querySelector('input') as HTMLInputElement,
      boton: elemento.querySelector('button.ver') as HTMLButtonElement,
    };
  };

  it('oculta la contraseña al inicio', async () => {
    const { campo, boton } = await crear();
    expect(campo.type).toBe('password');
    expect(boton.getAttribute('aria-label')).toBe('Mostrar contraseña');
    expect(boton.getAttribute('aria-pressed')).toBe('false');
    expect(boton.type).toBe('button');
  });

  it('muestra y vuelve a ocultar la contraseña con el botón', async () => {
    const { fixture, campo, boton } = await crear();

    boton.click();
    await fixture.whenStable();
    expect(campo.type).toBe('text');
    expect(boton.getAttribute('aria-label')).toBe('Ocultar contraseña');
    expect(boton.getAttribute('aria-pressed')).toBe('true');

    boton.click();
    await fixture.whenStable();
    expect(campo.type).toBe('password');
  });
});
