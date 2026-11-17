import { Injectable, computed, signal } from '@angular/core';
import { DatosToken, Rol } from './sesion.models';

const CLAVE_TOKEN = 'marketplace.token';

@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly tokenActual = signal<string | null>(this.leerTokenGuardado());

  readonly token = this.tokenActual.asReadonly();
  readonly datos = computed(() => this.decodificar(this.tokenActual()));
  readonly autenticado = computed(() => this.datos() !== null);
  readonly rol = computed<Rol | null>(() => this.datos()?.role ?? null);
  readonly correo = computed<string | null>(() => this.datos()?.sub ?? null);

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

  private leerTokenGuardado(): string | null {
    return localStorage.getItem(CLAVE_TOKEN);
  }

  private decodificar(token: string | null): DatosToken | null {
    if (!token) {
      return null;
    }
    try {
      const partes = token.split('.');
      if (partes.length !== 3) {
        return null;
      }
      const base64 = partes[1].replaceAll('-', '+').replaceAll('_', '/');
      const datos = JSON.parse(atob(base64)) as DatosToken;
      const vencido = datos.exp * 1000 <= Date.now();
      return vencido ? null : datos;
    } catch {
      return null;
    }
  }
}
