/** Roles definidos en el backend (tabla rol). */
export type Rol = 'HUESPED' | 'ANFITRION' | 'ADMINISTRADOR';

/** Respuesta de POST /autenticacion/login. */
export interface AutenticacionResponse {
  token: string;
  tipo: string;
}

/** Datos que el backend guarda dentro del JWT. */
export interface DatosToken {
  sub: string; // correo del usuario
  role: Rol;
  exp: number; // segundos desde 1970
}
