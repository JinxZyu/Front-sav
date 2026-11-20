import {
  accionAuditoria,
  entidadAuditoria,
  humanizarCodigo,
  nombreCampoDetalle,
  resultadoAuditoria,
} from './auditoria.models';

describe('textos de auditoría', () => {
  it('traduce las acciones a frases legibles con sus tildes', () => {
    expect(accionAuditoria('INICIO_SESION')).toBe('Inicio de sesión');
    expect(accionAuditoria('BLOQUEAR_PUBLICACION')).toBe('Bloquear publicación');
    expect(accionAuditoria('OCULTAR_RESENA')).toBe('Ocultar reseña');
    expect(accionAuditoria('EXPORTACION_SOLICITADA')).toBe('Exportación solicitada');
    expect(accionAuditoria('HTTP_DELETE_500')).toBe('Petición DELETE con error 500');
  });

  it('describe el resultado y la entidad afectada', () => {
    expect(resultadoAuditoria('EXITOSO')).toEqual({ etiqueta: 'Exitoso', tono: 'activa' });
    expect(resultadoAuditoria('FALLIDO')).toEqual({ etiqueta: 'Fallido', tono: 'rechazo' });
    expect(resultadoAuditoria('OTRO_RESULTADO')).toEqual({
      etiqueta: 'Otro resultado',
      tono: 'neutro',
    });
    expect(entidadAuditoria('RESENA')).toBe('Reseña');
    expect(entidadAuditoria('ENDPOINT')).toBe('Petición al sistema');
    expect(entidadAuditoria('PAGO_STRIPE')).toBe('Pago stripe');
    expect(entidadAuditoria(null)).toBeNull();
  });

  it('nombra los campos del detalle', () => {
    expect(nombreCampoDetalle('estadoAnterior')).toBe('Estado anterior');
    expect(nombreCampoDetalle('estadoHttp')).toBe('Estado HTTP');
    expect(nombreCampoDetalle('metodo')).toBe('Método');
    expect(nombreCampoDetalle('tipo_reporte')).toBe('Tipo reporte');
    expect(humanizarCodigo('TOKEN_INVALIDO')).toBe('Token inválido');
  });
});
