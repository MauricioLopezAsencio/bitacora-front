// empleado.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Constants } from '../utils/Constants';
import { HerramientaRequestDto, HerramientaResponseDto } from '../models/herramienta.model';

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

  // ---------- Herramientas ----------
  getHerramienta(): Observable<HerramientaResponseDto[]> {
    return this.http.get<any>(`${Constants.baseUrl}herramientas`).pipe(
      map((res: any) => Array.isArray(res) ? res : (res?.data ?? []))
    );
  }

  getHerramientaById(id: number): Observable<HerramientaResponseDto> {
    return this.http.get<any>(`${Constants.baseUrl}herramientas/${id}`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  saveHerramienta(dto: HerramientaRequestDto): Observable<any> {
    return this.http.post<any>(`${Constants.baseUrl}herramientas`, dto);
  }

  updateHerramienta(id: number, dto: HerramientaRequestDto): Observable<any> {
    return this.http.put<any>(`${Constants.baseUrl}herramientas/${id}`, dto);
  }

  deleteHerramienta(id: number): Observable<any> {
    return this.http.delete<any>(`${Constants.baseUrl}herramientas/${id}`);
  }

  toggleEstatusHerramienta(id: number): Observable<any> {
    return this.http.put(`${Constants.baseUrl}herramientas/${id}/toggle-estatus`, {});
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

  postactualizar(dto: any): Observable<any> {
    return this.http.put<any>(`${Constants.baseUrl}actualizar`, dto);
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

