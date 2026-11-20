import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SesionService } from '../../../config/auth/sesion.service';
import { crearToken } from '../../../config/auth/sesion.testing';
import { environment } from '../../../../environments/environment';
import { EventoAuditoria, PaginaAuditoria } from '../../models/auditoria.models';
import { publicacionAdministrada } from '../../models/publicacion-administrada.testing';
import { usuarioAdministrado } from '../../models/usuario-administrado.testing';
import { Auditoria } from './auditoria';

const evento = (cambios: Partial<EventoAuditoria> = {}): EventoAuditoria => ({
  idEvento: 'ev-1',
  idUsuario: 'u-1',
  fechaEvento: '2026-11-20T15:00:00Z',
  accion: 'BLOQUEAR_PUBLICACION',
  resultado: 'EXITOSO',
  entidadAfectada: 'PUBLICACION',
  idEntidadAfectada: 'p-1',
  detalleJson: '{"estadoAnterior": "ACTIVA", "estadoNuevo": "BLOQUEADA"}',
  idCorrelacion: 'c-1',
  ...cambios,
});

const pagina = (eventos: EventoAuditoria[], cambios: Partial<PaginaAuditoria> = {}) => ({
  eventos,
  pagina: 0,
  tamano: 20,
  totalResultados: eventos.length,
  totalPaginas: eventos.length ? 1 : 0,
  mensaje: null,
  ...cambios,
});

describe('Auditoria (HU-046)', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;
  const api = `${environment.apiUrl}/administracion`;
  const eventos = `${api}/auditoria/eventos`;

  const abrir = async (rol = 'ADMINISTRADOR') => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'administracion/auditoria', component: Auditoria }]),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(SesionService).iniciar(
      crearToken({ sub: 'persona@test.co', role: rol, exp: Math.floor(Date.now() / 1000) + 3600 }),
    );
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/administracion/auditoria');
  };

  const refrescar = async () => {
    await new Promise((resolver) => setTimeout(resolver));
    harness.detectChanges();
    TestBed.tick();
  };

  const listas = (usuariosFallan = false) => {
    const usuarios = backend.expectOne(`${api}/usuarios`);
    if (usuariosFallan) {
      usuarios.flush({}, { status: 500, statusText: 'Error' });
    } else {
      usuarios.flush([
        usuarioAdministrado(),
        usuarioAdministrado({
          idUsuario: 'u-2',
          nombre: 'Hugo',
          apellido: 'Pérez',
          correo: 'hugo@test.co',
        }),
      ]);
    }
    backend.expectOne(`${api}/publicaciones`).flush([publicacionAdministrada()]);
  };

  const consulta = (): TestRequest => backend.expectOne((req) => req.url === eventos);

  const responder = async (cuerpo: object, opciones?: { status: number; statusText: string }) => {
    consulta().flush(cuerpo, opciones);
    await refrescar();
  };

  const elemento = () => harness.routeNativeElement as HTMLElement;
  const tarjetas = () => [...elemento().querySelectorAll<HTMLElement>('li.evento')];
  const boton = (texto: string) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('button')].find((item) =>
      item.textContent?.trim().startsWith(texto),
    ) as HTMLButtonElement;
  const elegir = async (indice: number, valor: string) => {
    const campo = elemento().querySelectorAll<HTMLSelectElement | HTMLInputElement>(
      '.filtros-auditoria select, .filtros-auditoria input',
    )[indice];
    campo.value = valor;
    campo.dispatchEvent(new Event('change'));
    await refrescar();
  };

  afterEach(() => {
    backend.verify();
    TestBed.inject(SesionService).cerrar();
  });

  it('criterio 1: muestra quién, cuándo, sobre qué y con qué resultado', async () => {
    await abrir();
    expect(elemento().querySelector('[aria-busy="true"]')).not.toBeNull();
    listas();
    await responder(
      pagina([
        evento(),
        evento({
          idEvento: 'ev-2',
          idUsuario: null,
          accion: 'AUTENTICACION_TOKEN',
          resultado: 'FALLIDO',
          entidadAfectada: 'ENDPOINT',
          idEntidadAfectada: null,
          detalleJson: '{"motivo": "TOKEN_INVALIDO"}',
          idCorrelacion: null,
        }),
        evento({
          idEvento: 'ev-3',
          idUsuario: 'u-9',
          accion: 'RESTRINGIR_USUARIO',
          entidadAfectada: 'USUARIO',
          idEntidadAfectada: 'u-2',
          detalleJson: null,
          idCorrelacion: null,
        }),
      ]),
    );

    expect(elemento().querySelector('.resumen')?.textContent?.trim()).toBe('3 eventos');
    const [bloqueo, token, restriccion] = tarjetas();

    expect(bloqueo.querySelector('.accion')?.textContent?.trim()).toBe('Bloquear publicación');
    expect(bloqueo.querySelector('.etiqueta')?.textContent?.trim()).toBe('Exitoso');
    expect(bloqueo.querySelector('.meta')?.textContent).toContain('Ana Gómez · ana@test.co');
    expect(bloqueo.querySelector('.meta')?.textContent).toContain('20 de nov');
    const enlace = bloqueo.querySelector('.sobre a') as HTMLAnchorElement;
    expect(bloqueo.querySelector('.sobre')?.textContent).toContain('Publicación');
    expect(enlace.textContent?.trim()).toBe('Loft en Chapinero');
    expect(enlace.getAttribute('href')).toBe('/administracion/publicaciones/p-1');
    const campos = [...bloqueo.querySelectorAll('dl div')].map((fila) => [
      fila.querySelector('dt')?.textContent?.trim(),
      fila.querySelector('dd')?.textContent?.trim(),
    ]);
    expect(campos).toEqual([
      ['Estado anterior', 'Publicada'],
      ['Estado nuevo', 'Bloqueada'],
      ['Correlación', 'c-1'],
    ]);

    expect(token.querySelector('.accion')?.textContent?.trim()).toBe('Validación de sesión');
    expect(token.querySelector('.etiqueta')?.textContent?.trim()).toBe('Fallido');
    expect(token.querySelector('.meta')?.textContent).toContain('Sistema');
    expect(token.querySelector('.sobre')?.textContent?.trim()).toBe('Petición al sistema');
    expect(token.querySelector('dd')?.textContent?.trim()).toBe('Token inválido');

    expect(restriccion.querySelector('.meta')?.textContent).toContain('Usuario u-9');
    expect(restriccion.querySelector('.sobre')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Usuario · Hugo Pérez',
    );
    expect(restriccion.querySelector('details')).toBeNull();
  });

  it('el auditor de operación ve los mismos datos sin enlaces a la administración', async () => {
    await abrir('AUDITOR_OPERACION');
    listas();
    await responder(
      pagina([
        evento(),
        evento({
          idEvento: 'ev-2',
          entidadAfectada: 'EXPORTACION_REPORTE',
          idEntidadAfectada: 'e-1',
        }),
      ]),
    );

    const [bloqueo, reporte] = tarjetas();
    expect(bloqueo.querySelector('.sobre')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Publicación · Loft en Chapinero',
    );
    expect(bloqueo.querySelector('.meta')?.textContent).toContain('Ana Gómez · ana@test.co');
    expect(elemento().querySelector('.sobre a')).toBeNull();
    expect(reporte.querySelector('.sobre')?.textContent).toContain('Reporte');
  });

  it('criterio 2: filtra por usuario, entidad, resultado y fechas', async () => {
    await abrir();
    listas();
    await responder(pagina([evento()]));
    expect(boton('Limpiar filtros')).toBeUndefined();

    for (const [indice, valor] of [
      [0, 'u-2'],
      [1, 'PUBLICACION'],
      [2, 'FALLIDO'],
      [3, '2026-11-01'],
    ] as const) {
      await elegir(indice, valor);
      consulta().flush(pagina([evento()]));
    }
    await elegir(4, '2026-11-20');
    const filtrada = consulta();
    const { params } = filtrada.request;
    expect(params.get('idUsuario')).toBe('u-2');
    expect(params.get('entidadAfectada')).toBe('PUBLICACION');
    expect(params.get('resultado')).toBe('FALLIDO');
    expect(params.get('desde')).toBe(new Date('2026-11-01T00:00:00').toISOString());
    expect(params.get('hasta')).toBe(new Date('2026-11-20T23:59:59.999').toISOString());
    filtrada.flush(pagina([]));
    await refrescar();

    expect(elemento().querySelector('.vacio h2')?.textContent).toContain(
      'No hay eventos con estos filtros',
    );
    boton('Limpiar filtros').click();
    await refrescar();
    const limpia = consulta();
    expect(limpia.request.params.keys().sort()).toEqual(['pagina', 'tamano']);
    limpia.flush(pagina([]));
    await refrescar();
    expect(elemento().querySelector('.vacio h2')?.textContent).toContain(
      'Todavía no hay eventos registrados',
    );
    expect(
      [...elemento().querySelectorAll<HTMLSelectElement>('.filtros-auditoria select')].map(
        (campo) => campo.value,
      ),
    ).toEqual(['', '', '']);
  });

  it('no consulta si la fecha inicial es posterior a la final', async () => {
    await abrir();
    listas();
    await responder(pagina([evento()]));

    await elegir(3, '2026-11-20');
    consulta().flush(pagina([evento()]));
    await elegir(4, '2026-11-01');

    backend.expectNone((req) => req.url === eventos);
    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'La fecha inicial no puede ser posterior a la final.',
    );
    expect(tarjetas()).toHaveLength(0);
  });

  it('pasa de página y vuelve a la primera al cambiar un filtro', async () => {
    await abrir();
    listas();
    await responder(pagina([evento()], { totalResultados: 45, totalPaginas: 3 }));

    expect(elemento().querySelector('.resumen')?.textContent?.trim()).toBe('45 eventos');
    expect(elemento().querySelector('.paginacion span')?.textContent?.trim()).toBe('Página 1 de 3');
    expect(boton('Anterior').disabled).toBe(true);
    boton('Siguiente').click();
    await refrescar();
    const siguiente = consulta();
    expect(siguiente.request.params.get('pagina')).toBe('1');
    siguiente.flush(pagina([evento()], { pagina: 1, totalResultados: 45, totalPaginas: 3 }));
    await refrescar();
    expect(elemento().querySelector('.paginacion span')?.textContent?.trim()).toBe('Página 2 de 3');
    expect(boton('Anterior').disabled).toBe(false);

    await elegir(2, 'EXITOSO');
    expect(consulta().request.params.get('pagina')).toBe('0');
  });

  it('muestra el error del almacén y permite reintentar', async () => {
    await abrir();
    listas(true);
    await responder(
      { mensaje: 'El almacén de auditoría no está disponible.' },
      { status: 503, statusText: 'Unavailable' },
    );

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'El almacén de auditoría no está disponible.',
    );
    boton('Reintentar').click();
    await refrescar();
    await responder(pagina([evento()]));
    expect(tarjetas()[0].querySelector('.meta')?.textContent).toContain('Usuario u-1');
    expect(
      elemento().querySelectorAll('.filtros-auditoria select')[0].querySelectorAll('option'),
    ).toHaveLength(1);
  });
});
