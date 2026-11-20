export interface NuevaResena {
  calificacion: number;
  comentario: string;
}

export interface ResenaCreada {
  idResena: string;
  idReserva: string;
  calificacion: number;
  comentario: string;
  visible: boolean;
  fechaPublicacion: string;
  mensaje: string;
}

export interface ResenaPublica {
  idResena: string;
  calificacion: number;
  comentario: string;
  fechaPublicacion: string;
}

export interface ResenasPublicacion {
  idPublicacion: string;
  resenas: ResenaPublica[];
  totalResenas: number;
  calificacionPromedio: number;
  mensaje: string | null;
}

export const CALIFICACIONES = [1, 2, 3, 4, 5] as const;
