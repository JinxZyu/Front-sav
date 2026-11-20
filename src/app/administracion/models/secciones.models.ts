export interface SeccionAdministracion {
  ruta: string;
  nombre: string;
}

export const SECCIONES_ADMINISTRACION: readonly SeccionAdministracion[] = [
  { ruta: 'indicadores', nombre: 'Indicadores' },
  { ruta: 'usuarios', nombre: 'Usuarios' },
  { ruta: 'publicaciones', nombre: 'Publicaciones' },
  { ruta: 'tarifas', nombre: 'Tarifas' },
  { ruta: 'reportes', nombre: 'Reportes' },
  { ruta: 'auditoria', nombre: 'Auditoría' },
];

export const SECCIONES_AUDITOR: readonly SeccionAdministracion[] = [
  { ruta: 'indicadores', nombre: 'Indicadores' },
  { ruta: 'eventos', nombre: 'Eventos' },
];
