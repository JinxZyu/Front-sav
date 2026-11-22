import { formatearFechaHora } from '../../alojamiento/utils/formato';
import { mensajeLegible } from './mensaje-notificacion';

describe('mensajeLegible', () => {
  it('dice lo que le pasó a la reserva en una frase, no como "A → B"', () => {
    expect(mensajeLegible('Tu reserva cambió de estado: PENDIENTE_PAGO → CONFIRMADA.')).toBe(
      'Tu reserva fue confirmada.',
    );
    expect(
      mensajeLegible('Tu reserva cambió de estado: PENDIENTE_APROBACION → PENDIENTE_PAGO.'),
    ).toBe('Tu reserva quedó pendiente de pago.');
    expect(
      mensajeLegible('Una reserva de tu alojamiento cambió de estado: CONFIRMADA → CANCELADA.'),
    ).toBe('Una reserva de tu alojamiento fue cancelada.');
    expect(mensajeLegible('Tu reserva cambió de estado: PENDIENTE_PAGO → EXPIRADA.')).toBe(
      'Tu reserva venció.',
    );
  });

  it('si el estado nuevo no se conoce, deja la frase original con los estados traducidos', () => {
    expect(mensajeLegible('Tu reserva cambió de estado: CONFIRMADA → EN_DISPUTA.')).toBe(
      'Tu reserva cambió de estado: Confirmada → EN_DISPUTA.',
    );
  });

  it('traduce los estados de las publicaciones', () => {
    expect(mensajeLegible('El estado de tu publicación cambió de ACTIVA a PAUSADA.')).toBe(
      'El estado de tu publicación cambió de Publicada a Pausada.',
    );
  });

  it('traduce los modos de aceptación', () => {
    expect(mensajeLegible('El modo anterior era INMEDIATA y el nuevo modo es APROBACION.')).toBe(
      'El modo anterior era Reserva inmediata y el nuevo modo es Con mi aprobación.',
    );
  });

  it('quita los identificadores y da formato a las fechas en la zona del usuario', () => {
    const limite = '2026-11-21T08:28:24.744354Z';
    const mensaje = mensajeLegible(
      `La solicitud de reserva 6b6b588b-717e-4d0e-95b4-81273faf15b4 requiere tu decisión antes de ${limite}.`,
    );
    expect(mensaje).toBe(
      `La solicitud de reserva requiere tu decisión antes de ${formatearFechaHora(limite)}.`,
    );
    expect(mensaje).not.toContain('2026-11-21T');
  });

  it('quita el identificador del reporte con su rótulo', () => {
    expect(
      mensajeLegible(
        'El reporte está listo para descargar. Identificador: 3f2b8c1d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
      ),
    ).toBe('El reporte está listo para descargar.');
  });

  it('deja intactas las palabras en mayúsculas que no son estados', () => {
    expect(mensajeLegible('Revisa tu SOLICITUD pronto.')).toBe('Revisa tu SOLICITUD pronto.');
  });
});
