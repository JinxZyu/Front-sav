type Crear = (objeto: Blob | MediaSource) => string;
type Revocar = (url: string) => void;

export function simularUrlsDeObjeto(crear: Crear, revocar: Revocar): () => void {
  const crearOriginal = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  const revocarOriginal = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: crear,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: revocar,
  });
  return () => {
    for (const [nombre, original] of [
      ['createObjectURL', crearOriginal],
      ['revokeObjectURL', revocarOriginal],
    ] as const) {
      if (original) {
        Object.defineProperty(URL, nombre, original);
      } else {
        Reflect.deleteProperty(URL, nombre);
      }
    }
  };
}
