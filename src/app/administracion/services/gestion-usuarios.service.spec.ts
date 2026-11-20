import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { usuarioAdministrado } from '../models/usuario-administrado.testing';
import { GestionUsuariosService } from './gestion-usuarios.service';

describe('GestionUsuariosService', () => {
  let servicio: GestionUsuariosService;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/administracion/usuarios`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(GestionUsuariosService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('consulta el listado de usuarios', () => {
    let usuarios: unknown;
    servicio.listar().subscribe((respuesta) => (usuarios = respuesta));

    const peticion = backend.expectOne(api);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([usuarioAdministrado()]);

    expect(usuarios).toEqual([usuarioAdministrado()]);
  });

  it('restringe una cuenta enviando el motivo y lee la respuesta como texto', () => {
    let mensaje: unknown;
    servicio.restringir('u/1', 'Fraude').subscribe((respuesta) => (mensaje = respuesta));

    const peticion = backend.expectOne(`${api}/u%2F1/restringir`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({ motivo: 'Fraude' });
    expect(peticion.request.responseType).toBe('text');
    peticion.flush('La cuenta ha sido restringida correctamente.');

    expect(mensaje).toBe('La cuenta ha sido restringida correctamente.');
  });

  it('modifica el documento de una cuenta', () => {
    let mensaje: unknown;
    servicio
      .modificarDocumento('u-1', { tipoDocumento: 'CE', documentoIdentidad: 'AB12345' })
      .subscribe((respuesta) => (mensaje = respuesta));

    const peticion = backend.expectOne(`${api}/u-1/documento`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({ tipoDocumento: 'CE', documentoIdentidad: 'AB12345' });
    expect(peticion.request.responseType).toBe('text');
    peticion.flush('El documento de la cuenta se actualizó correctamente.');

    expect(mensaje).toBe('El documento de la cuenta se actualizó correctamente.');
  });

  it('levanta la restricción de una cuenta', () => {
    let mensaje: unknown;
    servicio.levantarRestriccion('u-1').subscribe((respuesta) => (mensaje = respuesta));

    const peticion = backend.expectOne(`${api}/u-1/levantar-restriccion`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toBeNull();
    expect(peticion.request.responseType).toBe('text');
    peticion.flush('Restricción levantada.');

    expect(mensaje).toBe('Restricción levantada.');
  });
});
