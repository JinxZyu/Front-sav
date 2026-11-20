export const ROLES = ['HUESPED', 'ANFITRION', 'ADMINISTRADOR', 'AUDITOR_OPERACION'] as const;

export type Rol = (typeof ROLES)[number];

export interface AutenticacionResponse {
  token: string;
  tipo: string;
}

export interface DatosToken {
  sub: string;
  role: Rol;
  exp: number;
}
