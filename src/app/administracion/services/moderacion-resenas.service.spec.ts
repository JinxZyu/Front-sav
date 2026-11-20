import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ModeracionResenasService } from './moderacion-resenas.service';

describe('ModeracionResenasService', () => {
  it('oculta una reseña con su motivo', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const backend = TestBed.inject(HttpTestingController);
    let mensaje: unknown;

    TestBed.inject(ModeracionResenasService)
      .ocultar('rs/1', 'Lenguaje ofensivo')
      .subscribe((respuesta) => (mensaje = respuesta.mensaje));

    const peticion = backend.expectOne(
      `${environment.apiUrl}/administracion/resenas/rs%2F1/ocultar`,
    );
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({ motivo: 'Lenguaje ofensivo' });
    peticion.flush({ mensaje: 'La reseña fue ocultada.' });
    expect(mensaje).toBe('La reseña fue ocultada.');
    backend.verify();
  });
});
