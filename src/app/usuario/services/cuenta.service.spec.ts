import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CuentaService } from './cuenta.service';

describe('CuentaService', () => {
  it('consulta los datos de la cuenta del usuario en sesión', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const servicio = TestBed.inject(CuentaService);
    const backend = TestBed.inject(HttpTestingController);
    let nombre = '';

    servicio.consultar().subscribe((cuenta) => (nombre = cuenta.nombre));
    const peticion = backend.expectOne(`${environment.apiUrl}/usuarios/mi_cuenta`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ nombre: 'Sophia', apellido: 'Mora' });

    expect(nombre).toBe('Sophia');
    backend.verify();
  });
});
