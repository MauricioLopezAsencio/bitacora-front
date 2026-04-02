export interface ActividadItem {
  idEmpleado: number;
  idActividad: 1 | 2;      // 1 = interna, 2 = externa
  idTipoActividad: number;
  idProyecto: number | string; // number cuando está emparejado, 'N/A' cuando no
  descripcion: string;
  fechaRegistro: string;   // yyyy-MM-dd
  horaInicio: string;      // HH:mm
  horaFin: string;         // HH:mm

  // Estado UI — añadido en cliente, nunca enviado al servidor
  registrando?: boolean;
  registrado?: boolean;
  proyectoSeleccionado?: number | null; // usado solo en sesionesNoPareadasAProyecto
}

export interface ActividadRequest {
  tokenMicrosoft: string;
  username: string;
  password: string;
  fechaInicio: string;
  fechaFin: string;
}
