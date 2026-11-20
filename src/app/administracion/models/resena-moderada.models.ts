export interface ResenaOcultada {
  idResena: string;
  idReserva: string;
  visible: boolean;
  idAdministradorModerador: string;
  motivoOcultamiento: string;
  fechaOcultamiento: string;
  mensaje: string;
}

export const MAXIMO_MOTIVO_RESENA = 2000;
