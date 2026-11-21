import {
  DetallePublicacion,
  PoliticaDePublicacion,
  ResumenPublicacion,
  ServicioAdicional,
} from '../../alojamiento/models/alojamiento.models';

export const TAMANO_PAGINA = 12;

export interface PaginaPublicaciones {
  publicaciones: ResumenPublicacion[];
  pagina: number;
  tamano: number;
  totalResultados: number;
  totalPaginas: number;
  mensaje: string;
}

export interface FiltrosBusqueda {
  ciudad: string;
  llegada: string;
  salida: string;
  huespedes: string;
  tipo: string;
  precioMinimo: string;
  precioMaximo: string;
  servicios: string[];
  pagina: number;
}

export interface DestinoSugerido {
  ciudad: string;
  pais: string | null;
  total: number;
}

export interface PublicacionPublica {
  publicacion: DetallePublicacion;
  serviciosAdicionales: ServicioAdicional[];
  politica: PoliticaDePublicacion | null;
}
