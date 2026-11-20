export interface Pais {
  idPais: string;
  codigoIso2: string;
  nombre: string;
}

export interface Ciudad {
  idCiudad: string;
  nombre: string;
}

export const PAIS_POR_DEFECTO = 'CO';
