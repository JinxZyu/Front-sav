import { Component, computed, effect, inject, untracked } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { map } from 'rxjs';
import { TarjetaPublicacion } from '../../../alojamiento/components/tarjeta-publicacion/tarjeta-publicacion';
import { TIPOS_ALOJAMIENTO } from '../../../alojamiento/models/alojamiento.models';
import { hoy, rangoValido } from '../../../disponibilidad/utils/fechas';
import { mensajeDeError } from '../../../shared/utils/mensaje-error';
import { FiltrosBusqueda } from '../../models/catalogo.models';
import { CatalogoService } from '../../services/catalogo.service';

const PATRON_ENTERO = /^\d*$/;

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
  imports: [ReactiveFormsModule, TarjetaPublicacion],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo {
  private readonly servicio = inject(CatalogoService);
  private readonly router = inject(Router);

  readonly tipos = TIPOS_ALOJAMIENTO;
  readonly minimo = hoy();

  readonly filtros = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map(leerFiltros)), {
    initialValue: leerFiltros(convertToParamMap({})),
  });

  readonly resultados = rxResource({
    params: () => this.filtros(),
    stream: ({ params }) => this.servicio.buscar(params),
  });

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

  marcado(idServicio: string): boolean {
    return this.formulario.controls.servicios.value.includes(idServicio);
  }

  alternarServicio(idServicio: string): void {
    const control = this.formulario.controls.servicios;
    control.setValue(
      this.marcado(idServicio)
        ? control.value.filter((actual) => actual !== idServicio)
        : [...control.value, idServicio],
    );
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
