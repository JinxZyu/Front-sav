import { estadoPublicacion, modoAceptacion } from './alojamiento.models';

describe('textos de las publicaciones', () => {
  it('traduce los estados conocidos', () => {
    expect(estadoPublicacion('BORRADOR')).toEqual({ etiqueta: 'Borrador', tono: 'borrador' });
    expect(estadoPublicacion('PENDIENTE_REVISION').etiqueta).toBe('En revisión');
    expect(estadoPublicacion('ACTIVA').etiqueta).toBe('Publicada');
    expect(estadoPublicacion('BLOQUEADA').tono).toBe('rechazo');
  });

  it('muestra legible un estado desconocido', () => {
    expect(estadoPublicacion('EN_ESPERA')).toEqual({ etiqueta: 'En espera', tono: 'neutro' });
  });

  it('traduce el modo de aceptación', () => {
    expect(modoAceptacion('INMEDIATA')).toBe('Reserva inmediata');
    expect(modoAceptacion('OTRO')).toBe('OTRO');
  });
});
