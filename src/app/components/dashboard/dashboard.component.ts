import { Component, OnInit } from '@angular/core';
import { BitacoraService } from 'src/app/services/bitacora.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  kpi = { totalUnidades: 0, unidadesDisponibles: 0, unidadesPrestadas: 0 };
  prestamosActivos: any[] = [];
  pPrestamos: number = 1;
  loading = false;

  constructor(private bitacoraService: BitacoraService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.bitacoraService.getDashboard().subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        this.kpi = {
          totalUnidades:       data.totalUnidades    ?? 0,
          unidadesDisponibles: data.totalDisponibles ?? 0,
          unidadesPrestadas:   data.totalPrestadas   ?? 0
        };
        this.prestamosActivos = (data.prestamosActivos ?? [])
          .slice()
          .sort((a: any, b: any) => (b.diasPrestado ?? 0) - (a.diasPrestado ?? 0));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  alertaColor(alerta: string): string {
    const map: Record<string, string> = {
      VERDE:    '#34d399',
      AMARILLO: '#fb923c',
      ROJO:     '#f87171',
    };
    return map[alerta?.toUpperCase()] ?? '#f87171';
  }

  alertaTooltip(alerta: string): string {
    const map: Record<string, string> = {
      VERDE:    'Primera mitad del turno',
      AMARILLO: 'Segunda mitad del turno',
      ROJO:     'Turno fuera de horario o día anterior',
    };
    return map[alerta?.toUpperCase()] ?? '';
  }

  getTurnoBadgeClass(turno: string): string {
    const map: Record<string, string> = {
      'MATUTINO':  'turno-badge matutino',
      'VESPERTINO':'turno-badge vespertino',
      'NOCTURNO':  'turno-badge nocturno',
    };
    return map[turno] ?? 'turno-badge matutino';
  }

  getTurnoLabel(turno: string): string {
    const map: Record<string, string> = {
      'MATUTINO':  '☀️ MATUTINO',
      'VESPERTINO':'🌅 VESPERTINO',
      'NOCTURNO':  '🌙 NOCTURNO',
    };
    return map[turno] ?? turno;
  }

}
