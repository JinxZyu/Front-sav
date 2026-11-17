export type Rol = 'HUESPED' | 'ANFITRION' | 'ADMINISTRADOR';

export interface AutenticacionResponse {
  token: string;
  tipo: string;
}

export interface DatosToken {
  sub: string;
  role: Rol;
  exp: number;
}
