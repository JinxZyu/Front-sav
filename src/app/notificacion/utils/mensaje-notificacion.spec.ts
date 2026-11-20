import { formatearFechaHora } from '../../alojamiento/utils/formato';
import { mensajeLegible } from './mensaje-notificacion';

describe('mensajeLegible', () => {
  it('traduce los estados de reservas y publicaciones', () => {
    expect(
      mensajeLegible('Tu reserva cambió de estado: PENDIENTE_APROBACION → PENDIENTE_PAGO.'),
    ).toBe('Tu reserva cambió de estado: Esperando aprobación → Pendiente de pago.');
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

  it('deja intactas las palabras en mayúsculas que no son estados', () => {
    expect(mensajeLegible('Revisa tu SOLICITUD pronto.')).toBe('Revisa tu SOLICITUD pronto.');
  });
});
