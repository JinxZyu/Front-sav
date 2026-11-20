import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { SesionService } from '../../../config/auth/sesion.service';
import { crearToken } from '../../../config/auth/sesion.testing';
import { AvisosService } from '../../../shared/services/avisos.service';
import { UsuarioAdministrado } from '../../models/usuario-administrado.models';
import { usuarioAdministrado } from '../../models/usuario-administrado.testing';
import { GestionUsuarios } from './gestion-usuarios';

describe('GestionUsuarios (HU-009)', () => {
  let fixture: ComponentFixture<GestionUsuarios>;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/administracion/usuarios`;

  const usuarios: UsuarioAdministrado[] = [
    usuarioAdministrado({
      idUsuario: 'u-2',
      nombre: 'Óscar',
      apellido: 'Ruiz',
      correo: 'oscar@test.co',
      rol: 'HUESPED',
    }),
    usuarioAdministrado({
      idUsuario: 'u-1',
      restringido: true,
      motivoRestriccion: 'Publicaciones fraudulentas',
    }),
    usuarioAdministrado({
      idUsuario: 'u-3',
      nombre: 'Admin',
      apellido: 'SAV',
      correo: 'Admin@test.co',
      rol: 'ADMINISTRADOR',
    }),
    usuarioAdministrado({
      idUsuario: 'u-4',
      nombre: 'Hugo',
      apellido: 'Díaz',
      correo: 'hugo@test.co',
      rol: 'HUESPED',
      estado: 'PENDIENTE_VERIFICACION',
    }),
  ];

  const crear = () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(SesionService).iniciar(
      crearToken({
        sub: 'admin@test.co',
        role: 'ADMINISTRADOR',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GestionUsuarios);
    fixture.detectChanges();
    TestBed.tick();
  };

  const listar = async (lista: UsuarioAdministrado[] = usuarios) => {
    backend.expectOne((peticion) => peticion.method === 'GET' && peticion.url === api).flush(lista);
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const tarjetas = () => [...elemento().querySelectorAll<HTMLElement>('li.usuario')];
  const tarjeta = (nombre: string) =>
    tarjetas().find(
      (item) => item.querySelector('h2')?.textContent?.trim() === nombre,
    ) as HTMLElement;
  const boton = (contenedor: HTMLElement, texto: string) =>
    [...contenedor.querySelectorAll<HTMLButtonElement>('button')].find((item) =>
      item.textContent?.trim().startsWith(texto),
    ) as HTMLButtonElement;
  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const escribirMotivo = async (contenedor: HTMLElement, texto: string) => {
    const campo = contenedor.querySelector('textarea') as HTMLTextAreaElement;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    await actualizar();
  };
  const enviarMotivo = (contenedor: HTMLElement) => {
    contenedor.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  afterEach(() => backend.verify());

  it('muestra un esqueleto mientras consulta', async () => {
    crear();
    expect(elemento().querySelector('[aria-busy="true"]')).not.toBeNull();
    await listar([]);
  });

  it('criterio 7: lista las cuentas con su rol, estado y restricción vigente', async () => {
    crear();
    await listar();

    expect(tarjetas().map((item) => item.querySelector('h2')?.textContent?.trim())).toEqual([
      'Admin SAV',
      'Ana Gómez',
      'Hugo Díaz',
      'Óscar Ruiz',
    ]);
    const ana = tarjeta('Ana Gómez');
    expect(ana.textContent).toContain('ana@test.co');
    expect(ana.textContent).toContain('Anfitrión');
    expect(ana.textContent).toContain('Activa');
    expect(ana.textContent).toContain('Restringida');
    expect(ana.textContent).toContain('Publicaciones fraudulentas');
    expect(tarjeta('Hugo Díaz').textContent).toContain('Sin verificar');
    expect(tarjeta('Óscar Ruiz').textContent).not.toContain('Restringida');
  });

  it('muestra el rol y el estado aunque el backend envíe un valor desconocido o vacío', async () => {
    crear();
    await listar([
      usuarioAdministrado({
        nombre: '',
        apellido: '',
        correo: 'sin-nombre@test.co',
        rol: 'SOPORTE' as UsuarioAdministrado['rol'],
        estado: 'SUSPENDIDA' as UsuarioAdministrado['estado'],
      }),
      usuarioAdministrado({ idUsuario: 'u-9', rol: null, estado: null }),
    ]);

    expect(tarjeta('sin-nombre@test.co').textContent).toContain('SOPORTE');
    expect(tarjeta('sin-nombre@test.co').textContent).toContain('SUSPENDIDA');
    expect(tarjeta('Ana Gómez').textContent).toContain('Sin rol');
  });

  it('busca por nombre o correo sin importar tildes ni mayúsculas', async () => {
    crear();
    await listar();
    const buscador = elemento().querySelector('input[type="search"]') as HTMLInputElement;

    buscador.value = 'oscar';
    buscador.dispatchEvent(new Event('input'));
    await actualizar();
    expect(tarjetas().map((item) => item.querySelector('h2')?.textContent?.trim())).toEqual([
      'Óscar Ruiz',
    ]);

    buscador.value = 'HUGO@';
    buscador.dispatchEvent(new Event('input'));
    await actualizar();
    expect(tarjetas().map((item) => item.querySelector('h2')?.textContent?.trim())).toEqual([
      'Hugo Díaz',
    ]);

    buscador.value = 'nadie';
    buscador.dispatchEvent(new Event('input'));
    await actualizar();
    expect(tarjetas()).toEqual([]);
    expect(elemento().textContent).toContain('No hay usuarios que coincidan');
  });

  it('filtra solo las cuentas restringidas', async () => {
    crear();
    await listar();
    const filtro = boton(elemento(), 'Restringidos');
    expect(filtro.textContent).toContain('(1)');
    expect(boton(elemento(), 'Todos').textContent).toContain('(4)');

    filtro.click();
    await actualizar();

    expect(filtro.getAttribute('aria-pressed')).toBe('true');
    expect(tarjetas().map((item) => item.querySelector('h2')?.textContent?.trim())).toEqual([
      'Ana Gómez',
    ]);
  });

  it('no ofrece acciones sobre la propia cuenta', async () => {
    crear();
    await listar();
    const propia = tarjeta('Admin SAV');
    expect(propia.textContent).toContain('Esta es tu cuenta.');
    expect(propia.querySelector('button')).toBeNull();
  });

  it('criterio 1: restringe la cuenta con el motivo y actualiza el listado', async () => {
    crear();
    await listar();
    const mostrar = vi.spyOn(TestBed.inject(AvisosService), 'mostrar');

    boton(tarjeta('Óscar Ruiz'), 'Restringir').click();
    await actualizar();
    await escribirMotivo(tarjeta('Óscar Ruiz'), '  Suplantación de identidad ');
    enviarMotivo(tarjeta('Óscar Ruiz'));

    expect(boton(tarjeta('Óscar Ruiz'), 'Restringiendo').disabled).toBe(true);
    const peticion = backend.expectOne(`${api}/u-2/restringir`);
    expect(peticion.request.body).toEqual({ motivo: 'Suplantación de identidad' });
    peticion.flush('La cuenta ha sido restringida correctamente.');
    fixture.detectChanges();

    expect(mostrar).toHaveBeenCalledWith(
      'Restringiste la cuenta de Óscar Ruiz',
      'La cuenta ha sido restringida correctamente.',
    );
    await listar(
      usuarios.map((usuario) =>
        usuario.idUsuario === 'u-2'
          ? { ...usuario, restringido: true, motivoRestriccion: 'Suplantación de identidad' }
          : usuario,
      ),
    );
    expect(tarjeta('Óscar Ruiz').textContent).toContain('Suplantación de identidad');
    expect(tarjeta('Óscar Ruiz').querySelector('form')).toBeNull();
    expect(boton(tarjeta('Óscar Ruiz'), 'Levantar restricción')).toBeDefined();
  });

  it('criterio 2: sin motivo no envía la restricción', async () => {
    crear();
    await listar();

    boton(tarjeta('Óscar Ruiz'), 'Restringir').click();
    await actualizar();
    enviarMotivo(tarjeta('Óscar Ruiz'));

    expect(tarjeta('Óscar Ruiz').textContent).toContain('Escribe el motivo.');
    backend.expectNone(`${api}/u-2/restringir`);
  });

  it('muestra el error del servidor y conserva el formulario', async () => {
    crear();
    await listar();

    boton(tarjeta('Óscar Ruiz'), 'Restringir').click();
    await actualizar();
    await escribirMotivo(tarjeta('Óscar Ruiz'), 'Fraude');
    enviarMotivo(tarjeta('Óscar Ruiz'));
    backend
      .expectOne(`${api}/u-2/restringir`)
      .flush('La cuenta ya tiene una restricción administrativa.', {
        status: 409,
        statusText: 'Conflict',
      });
    await actualizar();

    const formulario = tarjeta('Óscar Ruiz').querySelector('form') as HTMLFormElement;
    expect(formulario.querySelector('[role="alert"]')?.textContent).toContain(
      'La cuenta ya tiene una restricción administrativa.',
    );
    expect(boton(formulario, 'Restringir cuenta').disabled).toBe(false);
  });

  it('cancelar cierra el formulario sin enviar nada', async () => {
    crear();
    await listar();

    boton(tarjeta('Óscar Ruiz'), 'Restringir').click();
    await actualizar();
    boton(tarjeta('Óscar Ruiz'), 'Cancelar').click();
    await actualizar();

    expect(tarjeta('Óscar Ruiz').querySelector('form')).toBeNull();
    expect(boton(tarjeta('Óscar Ruiz'), 'Restringir')).toBeDefined();
  });

  it('criterio 5: levanta la restricción avisando que las publicaciones siguen pausadas', async () => {
    crear();
    await listar();
    const mostrar = vi.spyOn(TestBed.inject(AvisosService), 'mostrar');

    boton(tarjeta('Ana Gómez'), 'Levantar restricción').click();
    await actualizar();
    expect(tarjeta('Ana Gómez').textContent).toContain('podrá iniciar sesión de nuevo');
    expect(tarjeta('Ana Gómez').textContent).toContain(
      'Sus publicaciones seguirán pausadas hasta que las reactive.',
    );
    boton(tarjeta('Ana Gómez'), 'Levantar restricción').click();
    fixture.detectChanges();

    const peticion = backend.expectOne(`${api}/u-1/levantar-restriccion`);
    expect(peticion.request.method).toBe('PATCH');
    peticion.flush('La restricción administrativa ha sido levantada correctamente.');
    fixture.detectChanges();

    expect(mostrar).toHaveBeenCalledWith(
      'Levantaste la restricción de Ana Gómez',
      'La restricción administrativa ha sido levantada correctamente.',
    );
    await listar(
      usuarios.map((usuario) =>
        usuario.idUsuario === 'u-1'
          ? { ...usuario, restringido: false, motivoRestriccion: null }
          : usuario,
      ),
    );
    expect(tarjeta('Ana Gómez').textContent).not.toContain('Restringida');
  });

  it('al levantar la restricción de un huésped no menciona publicaciones', async () => {
    crear();
    await listar([
      usuarioAdministrado({ rol: 'HUESPED', restringido: true, motivoRestriccion: 'X' }),
    ]);

    boton(tarjeta('Ana Gómez'), 'Levantar restricción').click();
    await actualizar();

    expect(tarjeta('Ana Gómez').textContent).toContain('podrá iniciar sesión de nuevo');
    expect(tarjeta('Ana Gómez').textContent).not.toContain('publicaciones');
  });

  it('muestra el error al levantar la restricción', async () => {
    crear();
    await listar();

    boton(tarjeta('Ana Gómez'), 'Levantar restricción').click();
    await actualizar();
    boton(tarjeta('Ana Gómez'), 'Levantar restricción').click();
    fixture.detectChanges();
    backend
      .expectOne(`${api}/u-1/levantar-restriccion`)
      .flush('La cuenta no tiene una restricción administrativa vigente.', {
        status: 409,
        statusText: 'Conflict',
      });
    await actualizar();

    expect(tarjeta('Ana Gómez').querySelector('[role="alert"]')?.textContent).toContain(
      'La cuenta no tiene una restricción administrativa vigente.',
    );
  });

  it('si falla la consulta permite reintentar', async () => {
    crear();
    backend.expectOne(api).flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos consultar los usuarios.',
    );
    boton(elemento(), 'Reintentar').click();
    fixture.detectChanges();
    await listar();
    expect(tarjetas()).toHaveLength(4);
  });
});
