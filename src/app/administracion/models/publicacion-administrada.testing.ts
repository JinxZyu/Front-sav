import {
  PublicacionAdministrada,
  PublicacionParaRevision,
  ReservaAfectada,
} from './publicacion-administrada.models';

export const publicacionAdministrada = (
  cambios: Partial<PublicacionAdministrada> = {},
): PublicacionAdministrada => ({
  idPublicacion: 'p-1',
  idAlojamiento: 'a-1',
  titulo: 'Loft en Chapinero',
  estado: 'PENDIENTE_REVISION',
  fechaCreacion: '2026-11-10T15:00:00Z',
  fechaActualizacion: '2026-11-12T15:00:00Z',
  ...cambios,
});

export const publicacionParaRevisar = (estado = 'PENDIENTE_REVISION'): PublicacionParaRevision => ({
  publicacion: {
    idPublicacion: 'p-1',
    idAlojamiento: 'a-1',
    idPolitica: 'pol-1',
    titulo: 'Loft en Chapinero',
    descripcion: 'Loft con vista a los cerros.',
    reglas: 'No fumar.',
    precioPorNoche: 180000,
    tarifaLimpieza: 30000,
    modoAceptacion: 'APROBACION',
    estado,
    fechaCreacion: '2026-11-10T15:00:00Z',
    fechaActualizacion: '2026-11-12T15:00:00Z',
    ubicacion: 'Calle 60 # 5-10',
    ciudad: 'Bogotá',
    tipoAlojamiento: 'Apartamento',
    capacidad: 4,
    habitaciones: 2,
    camas: 3,
    banos: 1,
    propietarioInmueble: 'Inversiones Rojas',
    servicios: [{ idServicio: 's-1', nombre: 'Wifi', descripcion: null }],
    imagenes: [
      { idImagen: 'i-1', rutaImagen: 'https://img.test/1.jpg', orden: 1, esPortada: true },
    ],
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
  solicitudCambios: null,
});

export const reservaAfectada = (cambios: Partial<ReservaAfectada> = {}): ReservaAfectada => ({
  idReserva: 'r-1',
  idPublicacion: 'p-1',
  tituloPublicacion: 'Loft en Chapinero',
  idAlojamiento: 'a-1',
  nombreHuesped: 'Hugo Díaz',
  fechaEntrada: '2026-12-20',
  fechaSalida: '2026-12-23',
  estadoReserva: 'CONFIRMADA',
  motivoBloqueo: 'Información engañosa',
  ...cambios,
});
