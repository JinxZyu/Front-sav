import { inicioSegunRol } from './rutas';

describe('inicioSegunRol', () => {
  it('lleva a cada rol a su página de inicio', () => {
    expect(inicioSegunRol('HUESPED')).toBe('/publicaciones');
    expect(inicioSegunRol('ANFITRION')).toBe('/alojamientos');
    expect(inicioSegunRol('ADMINISTRADOR')).toBe('/administracion');
    expect(inicioSegunRol('AUDITOR_OPERACION')).toBe('/auditoria');
    expect(inicioSegunRol(null)).toBe('/publicaciones');
  });
});
