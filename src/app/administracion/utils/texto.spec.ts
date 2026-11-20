import { normalizar } from './texto';

describe('normalizar', () => {
  it('quita tildes y pasa a minúsculas para comparar textos', () => {
    expect(normalizar('Óscar PÉREZ Ñoño')).toBe('oscar perez nono');
  });
});
