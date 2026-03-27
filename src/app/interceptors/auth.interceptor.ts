import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = this.authService.getToken();

    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          const isLoginUrl = req.url.includes('auth/login');

          if (!isLoginUrl) {
            this.authService.logout();
            Swal.fire({
              html: '<p style="color:#fff;font-size:1rem;margin:0">Tu sesión ha expirado,<br>vuelve a iniciar sesión.</p>',
              icon: 'warning',
              showConfirmButton: false,
              timer: 3000,
              timerProgressBar: true
            });
          }
        }
        return throwError(() => err);
      })
    );
  }
}
