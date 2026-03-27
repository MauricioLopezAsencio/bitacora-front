import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Constants } from '../utils/Constants';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly TOKEN_KEY    = 'bt_token';
  private readonly USERNAME_KEY = 'bt_username';

  constructor(private http: HttpClient, private router: Router) {}

  login(user: string, password: string): Observable<any> {
    return this.http.post<any>(`${Constants.baseUrl}auth/login`, { user, password }).pipe(
      tap(res => {
        const data = res?.data ?? res;
        if (data?.token) {
          localStorage.setItem(this.TOKEN_KEY,    data.token);
          localStorage.setItem(this.USERNAME_KEY, data.username ?? user);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USERNAME_KEY);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUsername(): string | null {
    return localStorage.getItem(this.USERNAME_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
