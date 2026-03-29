export interface HerramientaResponseDto {
  id: number;
  nombre: string;
  categoria: string;
  estatus: boolean;
  cantidadTotal: number;
  cantidadDisponible: number;
}

export interface HerramientaRequestDto {
  nombre: string;
  categoria: string;
  estatus: boolean;
  cantidadTotal: number;
}
