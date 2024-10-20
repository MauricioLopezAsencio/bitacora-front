// empleado.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from '../utils/Constants';

@Injectable({
  providedIn: 'root'
})
export class BitacoraService {
  constructor(private http: HttpClient) { }

  getEmpleados(): Observable<any[]> {
    return this.http.get<any>(`${Constants.baseUrl}empleados`);
  }

  getHerramienta(): Observable<any[]> {
    return this.http.get<any>(`${Constants.baseUrl}products`);
  }
  
  getbitacora(): Observable<any[]> {
    return this.http.get<any>(`${Constants.baseUrl}bitacora`);
  }

  postAsignar(dto: any): Observable<any> {
    return this.http.post<any>(`${Constants.baseUrl}asignar`, dto);
  }
}

