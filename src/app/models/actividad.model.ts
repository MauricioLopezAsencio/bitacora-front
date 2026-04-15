export interface CatalogoItem {
  id: number;
  descripcion: string;
}

// Alias semántico reutilizado para proyectos, tipos y actividades
export type ProyectoDisponible = CatalogoItem;

export interface ActividadItem {
  idEmpleado: number;
  idActividad: number;
  idTipoActividad: number;
  idProyecto: number | string; // number cuando está emparejado, 'N/A' cuando no
  descripcion: string;
  fechaRegistro: string;   // yyyy-MM-dd
  horaInicio: string;      // HH:mm
  horaFin: string;         // HH:mm

  // Estado UI — añadido en cliente, nunca enviado al servidor
  registrando?: boolean;
  registrado?: boolean;
  proyectoSeleccionado?:       number | null;      // usado solo en sesionesNoPareadasAProyecto
  tipoActividadSeleccionado?:  number | null;      // sobreescribe idTipoActividad al registrar
  actividadSeleccionada?:      number | null;      // sobreescribe idActividad al registrar
  catalogoActividades?:        CatalogoItem[];     // catálogo dinámico cargado por fila
}

// El backend envuelve tiposActividad en su propio envelope interno
export interface TiposActividadEnvelope {
  status: string;
  statusCode: number;
  data: CatalogoItem[];
  message: string | null;
}

export interface ActividadData {
  actividades: ActividadItem[];
  sesionesNoPareadasAProyecto: ActividadItem[];
  proyectosDisponibles: ProyectoDisponible[];
  tiposActividad: TiposActividadEnvelope;
}

export interface ActividadRequest {
  tokenMicrosoft: string;
  username: string;
  password: string;
  fechaInicio: string;
  fechaFin: string;
}
