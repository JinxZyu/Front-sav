import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const FORMATO_DIA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const PATRON_DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function comoFecha(dia: string): Date | null {
  const partes = PATRON_DIA.exec(dia);
  if (!partes) {
    return null;
  }
  const fecha = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function comoDia(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function hoy(): string {
  return comoDia(new Date());
}

export function formatearDia(dia: string): string {
  const fecha = comoFecha(dia);
  return fecha ? FORMATO_DIA.format(fecha) : dia;
}

export function noches(inicio: string, fin: string): number {
  const desde = comoFecha(inicio);
  const hasta = comoFecha(fin);
  if (!desde || !hasta) {
    return 0;
  }
  return Math.round((hasta.getTime() - desde.getTime()) / 86_400_000);
}

export const rangoValido =
  (campoInicio: string, campoFin: string): ValidatorFn =>
  (grupo: AbstractControl): ValidationErrors | null => {
    const inicio = String(grupo.get(campoInicio)?.value ?? '');
    const fin = String(grupo.get(campoFin)?.value ?? '');
    if (!inicio || !fin) {
      return null;
    }
    return fin > inicio ? null : { rango: true };
  };

export const desdeHoy: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = String(control.value ?? '');
  return !valor || valor >= hoy() ? null : { pasado: true };
};
