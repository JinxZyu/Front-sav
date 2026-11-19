import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SesionService } from '../../../config/auth/sesion.service';
import { crearToken } from '../../../config/auth/sesion.testing';
import { environment } from '../../../../environments/environment';
import { UsuarioAdministrado } from '../../models/usuario.models';
import { GestionUsuarios } from './gestion-usuarios';

const usuario = (id: string, cambios: Partial<UsuarioAdministrado> = {}): UsuarioAdministrado => ({
  idUsuario: id,
  nombre: `Nombre${id}`,
  apellido: 'Apellido',
  correo: `u${id}@correo.com`,
  rol: 'HUESPED',
  estado: 'ACTIVA',
  restringido: false,
  motivoRestriccion: null,
  ...cambios,
});

describe('GestionUsuarios (HU-009)', () => {
  let fixture: ComponentFixture<GestionUsuarios>;
  let componente: GestionUsuarios;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/administracion/usuarios`;
  const lista = [
    usuario('1', { correo: 'admin@sav.com', nombre: 'Admin', rol: 'ADMINISTRADOR' }),
    usuario('2', { nombre: 'Sophia', restringido: true, motivoRestriccion: 'Fraude' }),
    usuario('3', { nombre: 'Carlos' }),
  ];

  const crear = () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(SesionService).iniciar(
      crearToken({
        sub: 'Admin@sav.com',
        role: 'ADMINISTRADOR',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GestionUsuarios);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  };

  const cargar = async (usuarios = lista) => {
    crear();
    backend.expectOne(api).flush(usuarios);
    await fixture.whenStable();
  };

  const elemento = () => fixture.nativeElement as HTMLElement;
  const filas = () => [...elemento().querySelectorAll('li[app-fila-usuario]')];

  afterEach(() => backend.verify());

  it('muestra un estado de carga mientras llegan los usuarios', () => {
    crear();
    expect(elemento().querySelector('.cargando')).not.toBeNull();
    backend.expectOne(api).flush([]);
  });

  it('criterio 7: lista las cuentas con el resumen de restricciones', async () => {
    await cargar();
    expect(filas()).toHaveLength(3);
    expect(elemento().querySelector('.resumen')?.textContent).toBe('3 cuentas · 1 con restricción');
  });

  it('marca la cuenta propia sin importar mayúsculas', async () => {
    await cargar();
    expect(componente.esPropia(lista[0])).toBe(true);
    expect(componente.esPropia(lista[1])).toBe(false);
    expect(filas()[0].querySelector('.tu')).not.toBeNull();
  });

  it('busca por nombre o correo', async () => {
    await cargar();
    const buscador = elemento().querySelector<HTMLInputElement>('input[type="search"]');
    if (buscador) {
      buscador.value = '  SOPHIA ';
      buscador.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    expect(filas()).toHaveLength(1);

    componente.buscar('u3@correo');
    await fixture.whenStable();
    expect(filas()[0].textContent).toContain('Carlos');

    componente.buscar('nadie');
    await fixture.whenStable();
    expect(elemento().querySelector('.vacio')?.textContent).toContain('Ninguna cuenta coincide');
  });

  it('filtra por cuentas con o sin restricción', async () => {
    await cargar();
    const selector = elemento().querySelector<HTMLSelectElement>('select');
    if (selector) {
      selector.value = 'restringidas';
      selector.dispatchEvent(new Event('change'));
    }
    await fixture.whenStable();
    expect(filas()).toHaveLength(1);

    componente.filtrar('sin-restriccion');
    await fixture.whenStable();
    expect(filas()).toHaveLength(2);
  });

  it('avisa si todavía no hay cuentas', async () => {
    await cargar([]);
    expect(elemento().querySelector('.vacio')?.textContent).toContain('Todavía no hay cuentas');
  });

  it('muestra el error si no se pudo cargar la lista y permite reintentar', async () => {
    crear();
    backend
      .expectOne(api)
      .flush({ mensaje: 'Sin permisos.' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Sin permisos.');
    elemento().querySelector<HTMLButtonElement>('.reintentar')?.click();
    TestBed.tick();
    backend.expectOne(api).flush(lista);
    await fixture.whenStable();
    expect(filas()).toHaveLength(3);
  });

  it('tras una acción muestra el aviso, recarga la lista y bloquea las filas mientras tanto', async () => {
    await cargar();
    componente.alActualizar('Carlos Apellido: La cuenta ha sido restringida correctamente.');
    TestBed.tick();
    fixture.detectChanges();

    const recarga = backend.expectOne(api);
    expect(elemento().querySelector('.usuarios')?.getAttribute('aria-busy')).toBe('true');
    expect(elemento().querySelector('.aviso')?.textContent).toContain('restringida correctamente');

    recarga.flush([lista[0], lista[1], { ...lista[2], restringido: true }]);
    await fixture.whenStable();
    expect(elemento().querySelector('.resumen')?.textContent).toBe('3 cuentas · 2 con restricción');
  });

  it('si falla la recarga conserva la lista y muestra el error', async () => {
    await cargar();
    componente.reintentar();
    TestBed.tick();
    backend.expectOne(api).flush('Error', { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(filas()).toHaveLength(3);
    expect(elemento().querySelector('[role="alert"]')).not.toBeNull();
  });

  describe('desbloqueo por intentos fallidos (HU-003, criterio 3)', () => {
    it('reactiva la cuenta bloqueada con su correo', async () => {
      await cargar();
      componente.correoDesbloqueo.setValue('Ana@Correo.com');
      componente.desbloquear();

      const peticion = backend.expectOne((r) => r.url === `${api}/reactivar-bloqueo`);
      expect(peticion.request.params.get('correo')).toBe('ana@correo.com');
      peticion.flush('La cuenta ha sido reactivada correctamente.');
      await fixture.whenStable();

      expect(elemento().querySelector('.desbloqueo [role="status"]')?.textContent).toBe(
        'La cuenta ha sido reactivada correctamente.',
      );
      expect(componente.correoDesbloqueo.value).toBe('');
    });

    it('usa un aviso por defecto si el backend no manda texto', async () => {
      await cargar();
      componente.correoDesbloqueo.setValue('ana@correo.com');
      componente.desbloquear();
      backend.expectOne((r) => r.url === `${api}/reactivar-bloqueo`).flush('');
      expect(componente.avisoDesbloqueo()).toBe('La cuenta ha sido reactivada correctamente.');
    });

    it('no envía un correo inválido', async () => {
      await cargar();
      componente.correoDesbloqueo.setValue('no-es-correo');
      componente.desbloquear();
      await fixture.whenStable();

      backend.expectNone((r) => r.url === `${api}/reactivar-bloqueo`);
      expect(elemento().querySelector('#error-desbloqueo')?.textContent).toBe(
        'Ingresa un correo válido.',
      );
    });

    it('informa si la cuenta no tenía bloqueo e ignora envíos repetidos', async () => {
      await cargar();
      componente.correoDesbloqueo.setValue('ana@correo.com');
      componente.desbloquear();
      componente.desbloquear();
      backend
        .expectOne((r) => r.url === `${api}/reactivar-bloqueo`)
        .flush('La cuenta no tiene un bloqueo automático pendiente de reactivación.', {
          status: 409,
          statusText: 'Conflict',
        });
      await fixture.whenStable();

      expect(elemento().querySelector('.desbloqueo [role="alert"]')?.textContent).toBe(
        'La cuenta no tiene un bloqueo automático pendiente de reactivación.',
      );
    });
  });
});
