export type RolRegistro = 'HUESPED' | 'ANFITRION';

export const TIPOS_DOCUMENTO = [
  { valor: 'CC', etiqueta: 'Cédula de ciudadanía' },
  { valor: 'CE', etiqueta: 'Cédula de extranjería' },
  { valor: 'TI', etiqueta: 'Tarjeta de identidad' },
  { valor: 'PASAPORTE', etiqueta: 'Pasaporte' },
] as const;

export interface RegistroRequest {
  nombre: string;
  apellido: string;
  correo: string;
  tipoDocumento: string;
  documentoIdentidad: string;
  telefono: string;
  contrasena: string;
  rol: RolRegistro;
}

export interface CredencialesRequest {
  correo: string;
  contrasena: string;
}
