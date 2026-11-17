import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SesionService } from '../auth/sesion.service';

/**
 * Agrega "Authorization: Bearer <token>" a las peticiones al backend
 * y cierra la sesión si el backend responde 401 (token inválido o vencido).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sesion = inject(SesionService);
  const router = inject(Router);

  const esBackend = req.url.startsWith(environment.apiUrl);
  const token = sesion.token();

  const peticion =
    esBackend && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (esBackend && token && error instanceof HttpErrorResponse && error.status === 401) {
        sesion.cerrar();
        router.navigateByUrl('/usuario/login');
      }
      return throwError(() => error);
    }),
  );
};
