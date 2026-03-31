import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Constants } from '../utils/Constants';
import { CorreoDestinatario, CorreoDestinatarioRequest } from '../models/correo.model';

@Injectable({ providedIn: 'root' })
export class CorreoService {

  private base = `${Constants.baseUrl}correos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<CorreoDestinatario[]> {
    return this.http.get<any>(this.base).pipe(
      map((res: any) => Array.isArray(res) ? res : (res?.data ?? []))
    );
  }

  create(dto: CorreoDestinatarioRequest): Observable<any> {
    return this.http.post<any>(this.base, dto);
  }

  update(id: number, dto: CorreoDestinatarioRequest): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/${id}`);
  }

  toggleActivo(id: number): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}/toggle-activo`, {});
  }
}
