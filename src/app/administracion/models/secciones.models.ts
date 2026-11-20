export interface SeccionAdministracion {
  ruta: string;
  nombre: string;
}

export const SECCIONES_ADMINISTRACION: readonly SeccionAdministracion[] = [
  { ruta: 'indicadores', nombre: 'Indicadores' },
  { ruta: 'usuarios', nombre: 'Usuarios' },
  { ruta: 'publicaciones', nombre: 'Publicaciones' },
  { ruta: 'tarifas', nombre: 'Tarifas' },
];
