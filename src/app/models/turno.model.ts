export interface TurnoConfig {
  id: number;
  cvTurno: string;
  horaInicio: number;
  horaFin: number;
  dsHorario: string;
}

export interface TurnoConfigRequest {
  horaInicio: number;
  horaFin: number;
}

export interface TurnoCreateRequest {
  cvTurno: string;
  horaInicio: number;
  horaFin: number;
}

export interface RecordatorioConfig {
  id: number;
  minutosRecordatorio: number;
  dsDescripcion: string;
}

export interface RecordatorioConfigRequest {
  minutosRecordatorio: number;
}
