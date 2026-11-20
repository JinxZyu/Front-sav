import { UsuarioAdministrado } from './usuario-administrado.models';

export const usuarioAdministrado = (
  cambios: Partial<UsuarioAdministrado> = {},
): UsuarioAdministrado => ({
  idUsuario: 'u-1',
  nombre: 'Ana',
  apellido: 'Gómez',
  correo: 'ana@test.co',
  rol: 'ANFITRION',
  estado: 'ACTIVA',
  restringido: false,
  motivoRestriccion: null,
  ...cambios,
});
