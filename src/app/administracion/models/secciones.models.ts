export interface SeccionAdministracion {
  ruta: string;
  nombre: string;
}

export const SECCIONES_ADMINISTRACION: readonly SeccionAdministracion[] = [
  { ruta: 'usuarios', nombre: 'Usuarios' },
  { ruta: 'publicaciones', nombre: 'Publicaciones' },
];
