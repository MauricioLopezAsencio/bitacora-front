import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from '../utils/Constants';
import { ActividadRequest } from '../models/actividad.model';

@Injectable({ providedIn: 'root' })
export class ActividadService {

  private readonly urlConsulta = Constants.baseUrl + 'actividades';
  private readonly urlRegistro = Constants.baseUrl + 'bitacora/actividades';

  constructor(private http: HttpClient) {}

  consultar(req: ActividadRequest): Observable<any> {
    return this.http.post<any>(this.urlConsulta, req);
  }

  registrar(body: object): Observable<any> {
    return this.http.post<any>(this.urlRegistro, body);
  }
}
