import { Rol } from '../../config/auth/sesion.models';

export type EstadoCuenta = 'PENDIENTE_VERIFICACION' | 'ACTIVA' | 'INACTIVA';

export interface UsuarioAdministrado {
  idUsuario: string;
  nombre: string;
  apellido: string;
  correo: string;
  rol: Rol | null;
  estado: EstadoCuenta | null;
  restringido: boolean;
  motivoRestriccion: string | null;
}

export const NOMBRES_ROL: Record<Rol, string> = {
  HUESPED: 'Huésped',
  ANFITRION: 'Anfitrión',
  ADMINISTRADOR: 'Administrador',
  AUDITOR_OPERACION: 'Auditor de operación',
};

export const NOMBRES_ESTADO_CUENTA: Record<EstadoCuenta, string> = {
  PENDIENTE_VERIFICACION: 'Sin verificar',
  ACTIVA: 'Activa',
  INACTIVA: 'Inactiva',
};

export const MAXIMO_MOTIVO_RESTRICCION = 255;
