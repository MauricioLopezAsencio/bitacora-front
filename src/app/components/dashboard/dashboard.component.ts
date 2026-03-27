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
      VERDE:    '#22c55e',
      AMARILLO: '#eab308',
      ROJO:     '#ef4444'
    };
    return map[alerta?.toUpperCase()] ?? '#94a3b8';
  }

}
