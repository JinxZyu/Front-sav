import { PublicacionPublica } from './catalogo.models';

export const publicacionPublica = (
  cambios: object = {},
  publicacion: object = {},
): PublicacionPublica => ({
  publicacion: {
    idPublicacion: 'p-1',
    idAlojamiento: 'a-1',
    idPolitica: 'pol-1',
    titulo: 'Loft en Chapinero',
    descripcion: 'Vista a los cerros.',
    reglas: 'No fumar.',
    precioPorNoche: 180000,
    tarifaLimpieza: 30000,
    modoAceptacion: 'INMEDIATA',
    estado: 'ACTIVA',
    fechaCreacion: '2026-11-18T10:00:00-05:00',
    fechaActualizacion: null,
    ubicacion: 'Calle 60 # 5-10',
    ciudad: 'Bogotá',
    tipoAlojamiento: 'Apartamento',
    capacidad: 4,
    habitaciones: 2,
    camas: 3,
    banos: 1,
    servicios: [{ idServicio: 's-1', nombre: 'Wifi', descripcion: null }],
    imagenes: [
      { idImagen: 'i-2', rutaImagen: 'https://img.test/2.jpg', orden: 2, esPortada: false },
      { idImagen: 'i-1', rutaImagen: 'https://img.test/1.jpg', orden: 1, esPortada: true },
    ],
    ...publicacion,
  },
  serviciosAdicionales: [
    { idAdicional: 'ad-1', nombre: 'Desayuno', descripcion: null, costo: 25000, activo: true },
  ],
  politica: {
    idPublicacion: 'p-1',
    idPolitica: 'pol-1',
    nombre: 'FLEXIBLE',
    version: 1,
    descripcion: 'Devolución total hasta 24 horas antes.',
    anticipacionHoras: 24,
    porcentajeDevolucion: 100,
    activa: true,
  },
  ...cambios,
});
