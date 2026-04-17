import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Constants } from '../utils/Constants';
import { ActividadData, ActividadRequest, CatalogoItem, EstadisticasMes, RegistroScoca } from '../models/actividad.model';

export interface ActividadApiResponse {
  status: number;
  data: ActividadData;
}

interface CatalogoApiResponse {
  status: number;
  data: CatalogoItem[];
}

@Injectable({ providedIn: 'root' })
export class ActividadService {

  private readonly urlConsulta      = Constants.baseUrl + 'actividades';
  private readonly urlRegistro      = Constants.baseUrl + 'bitacora/actividades';
  private readonly urlCatalogoActiv = Constants.baseUrl + 'bitacora/actividades';
  private readonly urlEstadisticas  = Constants.baseUrl + 'estadisticas/mes';
  private readonly urlRegistrosFecha = Constants.baseUrl + 'bitacora/registros/byFecha';

  constructor(private http: HttpClient) {}

  consultar(req: ActividadRequest): Observable<ActividadApiResponse> {
    return this.http.post<ActividadApiResponse>(this.urlConsulta, req);
  }

  registrar(body: object): Observable<any> {
    return this.http.post<any>(this.urlRegistro, body);
  }

  obtenerEstadisticasMes(username: string, password: string, mes: number, anio: number): Observable<EstadisticasMes> {
    return this.http.post<any>(this.urlEstadisticas, { username, password, mes, anio }).pipe(
      map(res => res?.data ?? res)
    );
  }

  obtenerRegistrosPorFecha(username: string, password: string, fecha: string): Observable<RegistroScoca[]> {
    return this.http.post<any>(this.urlRegistrosFecha, { username, password, fecha }).pipe(
      map(res => res?.data ?? [])
    );
  }

  getCatalogoActividades(idTipo: number, creds: { username: string; password: string }): Observable<CatalogoItem[]> {
    const params = new HttpParams()
      .set('username', creds.username)
      .set('password', creds.password);
    return this.http.get<any>(`${this.urlCatalogoActiv}/${idTipo}`, { params }).pipe(
      map(res => {
        const inner = res?.data;
        return Array.isArray(inner) ? inner : (inner?.data ?? []);
      })
    );
  }
}
