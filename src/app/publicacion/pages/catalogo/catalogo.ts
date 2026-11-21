import { Component, computed, effect, inject, linkedSignal, untracked } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { map } from 'rxjs';
import { TarjetaPublicacion } from '../../../alojamiento/components/tarjeta-publicacion/tarjeta-publicacion';
import { ResumenPublicacion } from '../../../alojamiento/models/alojamiento.models';
import { rangoValido } from '../../../disponibilidad/utils/fechas';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { BuscadorCatalogo } from '../../components/buscador-catalogo/buscador-catalogo';
import { CarruselPublicaciones } from '../../components/carrusel-publicaciones/carrusel-publicaciones';
import { DestinoSugerido, FiltrosBusqueda } from '../../models/catalogo.models';
import { CuentaService } from '../../../usuario/services/cuenta.service';
import { CatalogoService } from '../../services/catalogo.service';

const PATRON_ENTERO = /^\d*$/;
const MAXIMO_CIUDADES = 4;
const MAXIMO_POR_CARRUSEL = 12;

export interface GrupoCiudad {
  ciudad: string;
  publicaciones: ResumenPublicacion[];
}

export interface SeccionCatalogo {
  titulo: string;
  publicaciones: ResumenPublicacion[];
  verTodos: Record<string, string> | null;
}

export function regionDelNavegador(): string | null {
  const idiomas = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const idioma of idiomas) {
    const region = /-([A-Za-z]{2})$/.exec(idioma ?? '')?.[1];
    if (region) {
      return region.toUpperCase();
    }
  }
  return null;
}

function nombrePais(codigo: string, respaldo: string | null | undefined): string {
  try {
    return new Intl.DisplayNames(['es'], { type: 'region' }).of(codigo) ?? respaldo ?? codigo;
  } catch {
    return respaldo ?? codigo;
  }
}

function contarPorPais(publicaciones: readonly ResumenPublicacion[]): Map<string, number> {
  const conteo = new Map<string, number>();
  for (const { codigoPais } of publicaciones) {
    if (codigoPais) {
      conteo.set(codigoPais, (conteo.get(codigoPais) ?? 0) + 1);
    }
  }
  return conteo;
}

const sinTildes = (texto: string) =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();

function agruparPorCiudad(publicaciones: readonly ResumenPublicacion[]): GrupoCiudad[] {
  const grupos = new Map<string, GrupoCiudad>();
  for (const publicacion of publicaciones) {
    const clave = sinTildes(publicacion.ciudad ?? '');
    if (!clave) {
      continue;
    }
    const grupo = grupos.get(clave) ?? { ciudad: publicacion.ciudad.trim(), publicaciones: [] };
    grupo.publicaciones.push(publicacion);
    grupos.set(clave, grupo);
  }
  return [...grupos.values()].sort(
    (a, b) =>
      b.publicaciones.length - a.publicaciones.length || a.ciudad.localeCompare(b.ciudad, 'es'),
  );
}

const FILTROS_VACIOS = {
  ciudad: '',
  llegada: '',
  salida: '',
  huespedes: '',
  tipo: '',
  precioMinimo: '',
  precioMaximo: '',
  servicios: [] as string[],
};

const comoParametro = (valor: string | number | null): string | null =>
  valor === null || String(valor).trim() === '' ? null : String(valor).trim();

const preciosEnOrden = (grupo: AbstractControl): ValidationErrors | null => {
  const minimo = String(grupo.get('precioMinimo')?.value ?? '');
  const maximo = String(grupo.get('precioMaximo')?.value ?? '');
  return minimo && maximo && Number(minimo) > Number(maximo) ? { precios: true } : null;
};

function leerFiltros(parametros: ParamMap): FiltrosBusqueda {
  const texto = (nombre: string) => parametros.get(nombre)?.trim() ?? '';
  const pagina = Number(texto('pagina'));
  return {
    ciudad: texto('ciudad'),
    llegada: texto('llegada'),
    salida: texto('salida'),
    huespedes: texto('huespedes'),
    tipo: texto('tipo'),
    precioMinimo: texto('min'),
    precioMaximo: texto('max'),
    servicios: texto('servicios').split(',').filter(Boolean),
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 0,
  };
}

@Component({
  selector: 'app-catalogo',
  imports: [TarjetaPublicacion, CarruselPublicaciones, BuscadorCatalogo],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo {
  private readonly servicio = inject(CatalogoService);
  private readonly router = inject(Router);

  readonly filtros = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map(leerFiltros)), {
    initialValue: leerFiltros(convertToParamMap({})),
  });

  readonly hayFiltros = computed(() => {
    const { pagina: _pagina, servicios, ...valores } = this.filtros();
    return servicios.length > 0 || Object.values(valores).some((valor) => valor !== '');
  });

  readonly filtrosAvanzados = computed(() => {
    const { tipo, precioMinimo, precioMaximo, servicios } = this.filtros();
    return [tipo, precioMinimo, precioMaximo].filter(Boolean).length + servicios.length;
  });

  readonly avanzada = linkedSignal(() => this.filtrosAvanzados() > 0);

  readonly resultados = rxResource({
    params: () => (this.hayFiltros() ? this.filtros() : undefined),
    stream: ({ params }) => this.servicio.buscar(params),
  });

  readonly catalogo = rxResource({ stream: () => this.servicio.catalogo() });

  private readonly cuenta = inject(CuentaService).actual;

  private readonly datosCuenta = computed(() =>
    this.cuenta.hasValue() ? (this.cuenta.value() ?? null) : null,
  );

  readonly paisVisitante = computed(
    () => this.datosCuenta()?.codigoPais?.toUpperCase() || regionDelNavegador(),
  );

  private readonly todas = computed(() => (this.catalogo.hasValue() ? this.catalogo.value() : []));

  private readonly paisReferencia = computed(() => {
    const conteo = contarPorPais(this.todas());
    const visitante = this.paisVisitante();
    return visitante && conteo.has(visitante)
      ? visitante
      : ([...conteo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null);
  });

  readonly destinos = computed<DestinoSugerido[]>(() => {
    const referencia = this.paisReferencia();
    return agruparPorCiudad(this.todas())
      .map((grupo) => {
        const codigo = grupo.publicaciones[0].codigoPais;
        return {
          ciudad: grupo.ciudad,
          pais: codigo ? nombrePais(codigo, grupo.publicaciones[0].pais) : null,
          total: grupo.publicaciones.length,
          local: !referencia || !codigo || codigo === referencia,
        };
      })
      .sort((a, b) => Number(b.local) - Number(a.local))
      .map(({ ciudad, pais, total }) => ({ ciudad, pais, total }));
  });

  readonly secciones = computed<SeccionCatalogo[]>(() => {
    const todas = this.todas();
    if (todas.length === 0) {
      return [];
    }
    const referencia = this.paisReferencia();
    const locales = todas.filter(
      (publicacion) =>
        !referencia || !publicacion.codigoPais || publicacion.codigoPais === referencia,
    );
    const otras = todas.filter(
      (publicacion) =>
        referencia && publicacion.codigoPais && publicacion.codigoPais !== referencia,
    );
    const propia = sinTildes(this.datosCuenta()?.ciudad ?? '');
    const ciudades = agruparPorCiudad(locales).sort(
      (a, b) => Number(sinTildes(b.ciudad) === propia) - Number(sinTildes(a.ciudad) === propia),
    );

    const recientes: SeccionCatalogo = {
      titulo: 'Publicados recientemente',
      publicaciones: locales.slice(0, MAXIMO_POR_CARRUSEL),
      verTodos: null,
    };
    const porCiudad = ciudades.slice(0, MAXIMO_CIUDADES).map((grupo) => {
      const cercana = propia !== '' && sinTildes(grupo.ciudad) === propia;
      return {
        cercana,
        seccion: {
          titulo: `${cercana ? 'Cerca de ti en' : 'Alojamientos en'} ${grupo.ciudad}`,
          publicaciones: grupo.publicaciones.slice(0, MAXIMO_POR_CARRUSEL),
          verTodos: { ciudad: grupo.ciudad },
        },
      };
    });
    const porPais = [...contarPorPais(otras).entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([codigo]) => {
        const delPais = otras.filter((publicacion) => publicacion.codigoPais === codigo);
        return {
          titulo: `Alojamientos en ${nombrePais(codigo, delPais[0]?.pais)}`,
          publicaciones: delPais.slice(0, MAXIMO_POR_CARRUSEL),
          verTodos: null,
        };
      });
    const secciones: SeccionCatalogo[] = [
      ...porCiudad.filter(({ cercana }) => cercana).map(({ seccion }) => seccion),
      recientes,
      ...porCiudad.filter(({ cercana }) => !cercana).map(({ seccion }) => seccion),
      ...porPais,
    ];
    return secciones.filter((seccion) => seccion.publicaciones.length > 0);
  });

  readonly errorCatalogo = computed(() =>
    this.catalogo.status() === 'error'
      ? mensajeDeError(this.catalogo.error(), 'No pudimos cargar los alojamientos.')
      : null,
  );

  readonly servicios = rxResource({ stream: () => this.servicio.servicios() });

  readonly formulario = inject(FormBuilder).nonNullable.group(
    {
      ...FILTROS_VACIOS,
      huespedes: ['', [Validators.pattern(PATRON_ENTERO), Validators.min(1)]],
      precioMinimo: ['', [Validators.pattern(PATRON_ENTERO)]],
      precioMaximo: ['', [Validators.pattern(PATRON_ENTERO)]],
      servicios: [FILTROS_VACIOS.servicios],
    },
    { validators: [rangoValido('llegada', 'salida'), preciosEnOrden] },
  );

  private readonly valores = toSignal(this.formulario.valueChanges, {
    initialValue: this.formulario.getRawValue(),
  });

  readonly hayEscrito = computed(() => {
    const { servicios, ...valores } = this.valores();
    return (servicios?.length ?? 0) > 0 || Object.values(valores).some((valor) => !!valor);
  });

  readonly pagina = computed(() => (this.resultados.hasValue() ? this.resultados.value() : null));
  readonly publicaciones = computed(() => this.pagina()?.publicaciones ?? []);

  readonly error = computed(() =>
    this.resultados.status() === 'error'
      ? mensajeDeError(this.resultados.error(), 'No pudimos buscar alojamientos.')
      : null,
  );

  readonly parametrosDetalle = computed(() => {
    const { llegada, salida, huespedes } = this.filtros();
    const parametros: Record<string, string> = {};
    if (llegada && salida) {
      parametros['llegada'] = llegada;
      parametros['salida'] = salida;
    }
    if (huespedes) {
      parametros['huespedes'] = huespedes;
    }
    return parametros;
  });

  constructor() {
    effect(() => {
      const { pagina: _pagina, ...valores } = this.filtros();
      untracked(() => this.formulario.reset(valores));
    });
  }

  buscar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valores = this.formulario.getRawValue();
    void this.router.navigate([], {
      queryParams: {
        ciudad: comoParametro(valores.ciudad),
        llegada: comoParametro(valores.llegada),
        salida: comoParametro(valores.salida),
        huespedes: comoParametro(valores.huespedes),
        tipo: comoParametro(valores.tipo),
        min: comoParametro(valores.precioMinimo),
        max: comoParametro(valores.precioMaximo),
        servicios: comoParametro(valores.servicios.join(',')),
      },
    });
  }

  limpiar(): void {
    this.formulario.reset(FILTROS_VACIOS);
    void this.router.navigate([], { queryParams: {} });
  }

  irAPagina(pagina: number): void {
    void this.router.navigate([], {
      queryParams: { pagina: pagina > 0 ? pagina : null },
      queryParamsHandling: 'merge',
    });
  }
}
