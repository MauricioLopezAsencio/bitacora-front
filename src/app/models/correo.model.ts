export interface CorreoDestinatario {
  id: number;
  dsNombre: string;
  dsCorreo: string;
  boActivo: boolean;
  boRecordatorios: boolean;
  boBitacora: boolean;
}

export interface CorreoDestinatarioRequest {
  dsNombre: string;
  dsCorreo: string;
  boActivo: boolean;
  boRecordatorios: boolean;
  boBitacora: boolean;
}
