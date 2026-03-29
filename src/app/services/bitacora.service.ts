// empleado.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Constants } from '../utils/Constants';

@Injectable({
  providedIn: 'root'
})
export class BitacoraService {
  constructor(private http: HttpClient) { }

  getEmpleados(): Observable<any[]> {
    return this.http.get<any>(`${Constants.baseUrl}empleados`).pipe(
      map((res: any) => Array.isArray(res) ? res : (res?.data ?? []))
    );
  }

  getHerramienta(): Observable<any[]> {
    return this.http.get<any>(`${Constants.baseUrl}products`);
  }

  productsActivos(): Observable<any[]> {
    return this.http.get<any[]>(`${Constants.baseUrl}productsActivos`);
  }

  getDashboard(): Observable<any> {
    return this.http.get<any>(`${Constants.baseUrl}dashboard`);
  }

  getbitacora(): Observable<any[]> {
    return this.http.get<any>(`${Constants.baseUrl}bitacora`).pipe(
      map((res: any) => Array.isArray(res) ? res : (res?.data ?? []))
    );
  }

  postAsignar(dto: any): Observable<any> {
    return this.http.post<any>(`${Constants.baseUrl}asignar`, dto);
  }

  saveHerramienta(dto: any): Observable<any> {
    return this.http.post<any>(`${Constants.baseUrl}saveHerramienta`, dto);
  }

  postactualizar(dto: any): Observable<any> {
    return this.http.put<any>(`${Constants.baseUrl}actualizar`, dto);
  }

  inactivarHerramienta(id: number): Observable<any> {
    return this.http.put(`${Constants.baseUrl}inactivarHerramienta/${id}`, {});
  }

  // ---------- Empleados ----------
  saveEmpleado(dto: { nombre: string; nomina: number }): Observable<any> {
    return this.http.post(`${Constants.baseUrl}empleados`, dto);
  }

  actualizarEmpleado(id: number, dto: { nombre: string; nomina: number }): Observable<any> {
    return this.http.put(`${Constants.baseUrl}empleados/${id}`, dto);
  }

  eliminarEmpleado(id: number): Observable<any> {
    return this.http.delete(`${Constants.baseUrl}empleados/${id}`);
  }
}

