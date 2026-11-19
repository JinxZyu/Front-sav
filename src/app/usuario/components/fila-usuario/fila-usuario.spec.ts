import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { UsuarioAdministrado } from '../../models/usuario.models';
import { FilaUsuario } from './fila-usuario';

const base: UsuarioAdministrado = {
  idUsuario: 'u-2',
  nombre: 'Carlos',
  apellido: 'Ruiz',
  correo: 'carlos@correo.com',
  rol: 'HUESPED',
  estado: 'ACTIVA',
  restringido: false,
  motivoRestriccion: null,
};

@Component({
  imports: [FilaUsuario],
  template: `<ul>
    <li
      app-fila-usuario
      [usuario]="usuario()"
      [bloqueado]="bloqueado()"
      [esPropia]="esPropia()"
      (actualizado)="mensajes.push($event)"
    ></li>
  </ul>`,
})
class Anfitrion {
  readonly usuario = signal(base);
  readonly bloqueado = signal(false);
  readonly esPropia = signal(false);
  readonly mensajes: string[] = [];
}

describe('FilaUsuario (HU-009)', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/administracion/usuarios`;

  const crear = async (cambios: Partial<UsuarioAdministrado> = {}) => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Anfitrion);
    fixture.componentInstance.usuario.set({ ...base, ...cambios });
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const fila = () => fixture.debugElement.children[0].children[0].componentInstance as FilaUsuario;
  const boton = (texto: string) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('button')].find(
      (opcion) => opcion.textContent?.trim() === texto,
    );

  afterEach(() => {
    backend.verify();
    fixture.nativeElement.remove();
  });

  it('criterio 7: muestra nombre, correo, rol y estado', async () => {
    await crear();
    expect(elemento().textContent).toContain('Carlos Ruiz');
    expect(elemento().textContent).toContain('carlos@correo.com');
    expect(elemento().querySelector('.chip.rol')?.textContent).toBe('Huésped');
    expect(elemento().querySelector('.chip.activa')?.textContent).toBe('Activa');
    expect(elemento().querySelector('.chip.restringida')).toBeNull();
  });

  it('criterio 7: muestra la restricción vigente con su motivo', async () => {
    await crear({
      restringido: true,
      motivoRestriccion: 'Fraude',
      estado: 'INACTIVA',
      rol: 'OTRO',
    });
    expect(elemento().querySelector('.chip.restringida')?.textContent).toBe('Restringida');
    expect(elemento().querySelector('.motivo')?.textContent).toContain('Fraude');
    expect(elemento().querySelector('.chip.inactiva')?.textContent).toBe('Desactivada');
    expect(elemento().querySelector('.chip.rol')?.textContent).toBe('OTRO');
    expect(boton('Levantar restricción')).toBeDefined();
  });

  it('muestra los valores tal cual si no los conoce', async () => {
    await crear({ rol: null, estado: null });
    expect(elemento().querySelector('.chip.rol')?.textContent).toBe('');
  });

  it('no ofrece acciones sobre la cuenta propia', async () => {
    await crear();
    fixture.componentInstance.esPropia.set(true);
    await fixture.whenStable();
    expect(elemento().querySelector('.tu')?.textContent).toBe('Tú');
    expect(elemento().querySelectorAll('button')).toHaveLength(0);
  });

  it('criterio 1: restringe con el motivo escrito y avisa', async () => {
    await crear();
    boton('Restringir')?.click();
    await fixture.whenStable();

    const campo = elemento().querySelector('textarea');
    expect(document.activeElement).toBe(campo);
    fila().motivo.setValue('  Suplantación de identidad ');
    fila().restringir();

    const peticion = backend.expectOne(`${api}/u-2/restringir`);
    expect(peticion.request.body).toEqual({ motivo: 'Suplantación de identidad' });
    peticion.flush('La cuenta ha sido restringida correctamente.');
    await fixture.whenStable();

    expect(fixture.componentInstance.mensajes).toEqual([
      'Carlos Ruiz: La cuenta ha sido restringida correctamente.',
    ]);
    expect(fila().modo()).toBe('ver');
  });

  it('criterio 2: no restringe sin motivo y lo pide', async () => {
    await crear();
    fila().abrir('restringir');
    await fixture.whenStable();
    fila().motivo.setValue('   ');
    fila().restringir();
    await fixture.whenStable();

    backend.expectNone(`${api}/u-2/restringir`);
    const campo = elemento().querySelector('textarea');
    expect(campo?.getAttribute('aria-invalid')).toBe('true');
    expect(campo?.getAttribute('aria-describedby')).toBe('error-motivo-u-2');
    expect(elemento().textContent).toContain('Escribe el motivo de la restricción');
  });

  it('informa el error del backend y conserva el formulario', async () => {
    await crear();
    fila().abrir('restringir');
    fila().motivo.setValue('Fraude');
    fila().restringir();
    backend
      .expectOne(`${api}/u-2/restringir`)
      .flush('La cuenta ya tiene una restricción administrativa.', {
        status: 409,
        statusText: 'Conflict',
      });
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toBe(
      'La cuenta ya tiene una restricción administrativa.',
    );
    expect(fila().modo()).toBe('restringir');
    expect(fixture.componentInstance.mensajes).toEqual([]);
  });

  it('criterio 5: levanta la restricción y aclara que las publicaciones del anfitrión siguen pausadas', async () => {
    await crear({ restringido: true, motivoRestriccion: 'Fraude', rol: 'ANFITRION' });
    boton('Levantar restricción')?.click();
    await fixture.whenStable();
    expect(elemento().textContent).toContain('Sus publicaciones seguirán pausadas');

    fila().levantar();
    const peticion = backend.expectOne(`${api}/u-2/levantar-restriccion`);
    expect(peticion.request.method).toBe('PATCH');
    peticion.flush('');

    expect(fixture.componentInstance.mensajes).toEqual([
      'Carlos Ruiz: La restricción administrativa ha sido levantada correctamente.',
    ]);
  });

  it('al huésped no le menciona publicaciones al levantar la restricción', async () => {
    await crear({ restringido: true });
    fila().abrir('levantar');
    await fixture.whenStable();
    expect(elemento().textContent).not.toContain('publicaciones');
  });

  it('no abre acciones mientras la lista se recarga', async () => {
    await crear();
    fixture.componentInstance.bloqueado.set(true);
    await fixture.whenStable();

    expect(boton('Restringir')?.disabled).toBe(true);
    fila().abrir('restringir');
    expect(fila().modo()).toBe('ver');
  });

  it('ignora envíos repetidos y no deja cancelar mientras guarda', async () => {
    await crear({ restringido: true });
    fila().abrir('levantar');
    fila().levantar();
    fila().levantar();
    fila().cancelar();
    fila().abrir('restringir');
    fila().restringir();

    expect(fila().modo()).toBe('levantar');
    backend.expectOne(`${api}/u-2/levantar-restriccion`).flush('ok');
  });

  it('cancelar cierra el formulario y devuelve el foco al botón', async () => {
    await crear();
    fila().abrir('restringir');
    await fixture.whenStable();
    boton('Cancelar')?.click();
    await fixture.whenStable();

    expect(fila().modo()).toBe('ver');
    expect(document.activeElement).toBe(boton('Restringir'));
  });
});
