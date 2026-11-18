import { Injectable, computed, signal } from '@angular/core';
import { DatosToken, ROLES, Rol } from './sesion.models';

const CLAVE_TOKEN = 'marketplace.token';

@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly tokenActual = signal<string | null>(localStorage.getItem(CLAVE_TOKEN));
  private readonly contenido = computed(() => decodificar(this.tokenActual()));

  readonly token = this.tokenActual.asReadonly();

  datos(): DatosToken | null {
    const datos = this.contenido();
    return datos && datos.exp * 1000 > Date.now() ? datos : null;
  }

  autenticado(): boolean {
    return this.datos() !== null;
  }

  rol(): Rol | null {
    return this.datos()?.role ?? null;
  }

  correo(): string | null {
    return this.datos()?.sub ?? null;
  }

  iniciar(token: string): void {
    localStorage.setItem(CLAVE_TOKEN, token);
    this.tokenActual.set(token);
  }

  cerrar(): void {
    localStorage.removeItem(CLAVE_TOKEN);
    this.tokenActual.set(null);
  }

  tieneRol(...roles: Rol[]): boolean {
    const rol = this.rol();
    return rol !== null && roles.includes(rol);
  }
}

function decodificar(token: string | null): DatosToken | null {
  if (!token) {
    return null;
  }
  const partes = token.split('.');
  if (partes.length !== 3) {
    return null;
  }
  try {
    const base64 = partes[1].replaceAll('-', '+').replaceAll('_', '/');
    const bytes = Uint8Array.from(atob(base64), (caracter) => caracter.codePointAt(0) ?? 0);
    const datos: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return esDatosToken(datos) ? datos : null;
  } catch {
    return null;
  }
}

function esDatosToken(valor: unknown): valor is DatosToken {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }
  const { sub, role, exp } = valor as Record<string, unknown>;
  return (
    typeof sub === 'string' &&
    sub !== '' &&
    typeof exp === 'number' &&
    Number.isFinite(exp) &&
    typeof role === 'string' &&
    (ROLES as readonly string[]).includes(role)
  );
}
