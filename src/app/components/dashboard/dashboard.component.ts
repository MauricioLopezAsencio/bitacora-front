import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { BitacoraService } from 'src/app/services/bitacora.service';
import { HerramientaRequestDto } from 'src/app/models/herramienta.model';
import { TurnoConfig } from 'src/app/models/turno.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  kpi = { totalUnidades: 0, unidadesDisponibles: 0, unidadesPrestadas: 0 };
  prestamosActivos: any[] = [];
  loading = false;
  turnos: TurnoConfig[] = [];

  // Modal bitácora
  showModalRegistro = false;
  registros:    any[] = [];
  herramientas: any[] = [];
  formularioRegistro!: FormGroup;

  turnoOptions = [
    { label: '☀️ MATUTINO',   value: 'MATUTINO'   },
    { label: '🌅 VESPERTINO', value: 'VESPERTINO' },
    { label: '🌙 NOCTURNO',   value: 'NOCTURNO'   },
  ];

  // Modal herramienta
  showModalHerramienta = false;
  formularioHerramienta!: FormGroup;
  herramientaErrors: Record<string, string> = {};

  constructor(private bitacoraService: BitacoraService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.formularioRegistro = this.fb.group({
      empleadoId:    ['', Validators.required],
      herramientaId: ['', Validators.required],
      turno:         ['', Validators.required],
    });
    this.formularioHerramienta = this.fb.group({
      nombre:        ['', Validators.required],
      cantidadTotal: [null, [Validators.required, Validators.min(1), Validators.pattern('^[0-9]+$')]],
    });
    this.bitacoraService.getTurnos().subscribe({
      next: (turnos) => {
        this.turnos = turnos;
        this.formularioRegistro.patchValue({ turno: this.calcularTurnoActual() });
      }
    });
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

  private calcularTurnoActual(): string {
    const hourMX = parseInt(
      new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        hour: 'numeric',
        hour12: false,
      }).format(new Date()),
      10
    );
    for (const t of this.turnos) {
      if (t.horaFin < t.horaInicio) {
        // Turno nocturno: cruza medianoche
        if (hourMX >= t.horaInicio || hourMX < t.horaFin) return t.cvTurno;
      } else {
        if (hourMX >= t.horaInicio && hourMX < t.horaFin) return t.cvTurno;
      }
    }
    return this.turnos[0]?.cvTurno ?? 'MATUTINO';
  }

  // ---- Modal Registro ----

  abrirModalRegistro(): void {
    Swal.fire({
      html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Cargando datos...<br><small>Por favor, espere.</small></p>',
      showConfirmButton: false,
      allowOutsideClick: false
    });

    forkJoin({
      empleados:    this.bitacoraService.getEmpleados(),
      herramientas: this.bitacoraService.productsActivos()
    }).subscribe({
      next: ({ empleados, herramientas }) => {
        this.registros    = empleados;
        this.herramientas = herramientas.map((h: any) => ({ herramientaId: h.id, nombre: h.nombre }));
        this.formularioRegistro.reset({ turno: this.calcularTurnoActual() });
        Swal.close();
        this.showModalRegistro = true;
      },
      error: () => {
        Swal.fire({ title: 'Error al cargar datos', icon: 'error', timer: 2000, showConfirmButton: false });
      }
    });
  }

  cerrarModalRegistro(): void {
    this.showModalRegistro = false;
  }

  onSubmitRegistro(): void {
    if (this.formularioRegistro.invalid) return;
    this.cerrarModalRegistro();
    this.guardarRegistroBitacora(this.formularioRegistro.value);
  }

  guardarRegistroBitacora(dto: { empleadoId: number; herramientaId: number; turno: string }): void {
    Swal.fire({
      html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Guardando registro...<br><small>Por favor, espere.</small></p>',
      showConfirmButton: false,
      allowOutsideClick: false
    });

    this.bitacoraService.postAsignar(dto).subscribe({
      next: (response) => {
        this.loadDashboard();
        setTimeout(() => {
          Swal.fire({
            title: response?.message ?? '¡Registro exitoso!',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }, 150);
      },
      error: (err) => {
        Swal.fire({
          title: 'No se pudo registrar',
          text: err?.error?.message ?? 'Ocurrió un error inesperado.',
          icon: 'error'
        });
      }
    });
  }

  // ---- Modal Herramienta ----

  abrirModalHerramienta(): void {
    this.herramientaErrors = {};
    this.formularioHerramienta.reset();
    this.showModalHerramienta = true;
  }

  cerrarModalHerramienta(): void {
    this.showModalHerramienta = false;
    this.herramientaErrors = {};
  }

  onSubmitHerramienta(): void {
    this.herramientaErrors = {};
    if (this.formularioHerramienta.invalid) return;

    const dto: HerramientaRequestDto = {
      nombre:        this.formularioHerramienta.get('nombre')?.value,
      categoria:     'GENERICO',
      cantidadTotal: Number(this.formularioHerramienta.get('cantidadTotal')?.value),
      estatus:       true
    };

    this.cerrarModalHerramienta();

    Swal.fire({
      html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Guardando herramienta...<br><small>Por favor, espere.</small></p>',
      showConfirmButton: false,
      allowOutsideClick: false
    });

    this.bitacoraService.saveHerramienta(dto).subscribe({
      next: (response) => {
        this.loadDashboard();
        setTimeout(() => {
          Swal.fire({
            title: response?.message ?? '¡Herramienta registrada!',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }, 150);
      },
      error: (err) => {
        if (err?.status === 422 && err?.error?.validationErrors) {
          this.herramientaErrors = err.error.validationErrors;
          this.showModalHerramienta = true;
          Swal.close();
        } else {
          Swal.fire({
            title: 'No se pudo guardar',
            text: err?.error?.message ?? 'Ocurrió un error inesperado.',
            icon: 'error'
          });
        }
      }
    });
  }

  // ---- Modal Préstamos ----

  abrirModalPrestadas(): void {
    if (!this.prestamosActivos.length) {
      Swal.fire({ title: 'Sin préstamos activos', icon: 'info', timer: 2000, showConfirmButton: false });
      return;
    }

    const thStyle = `padding:.5rem .75rem;font-size:.7rem;font-weight:600;text-transform:uppercase;
                     letter-spacing:.05em;color:rgba(255,255,255,.7);
                     border-bottom:1px solid rgba(255,255,255,.12);white-space:nowrap;`;

    const btnStyle = `display:inline-flex;align-items:center;justify-content:center;
                      width:2rem;height:2rem;border-radius:.375rem;
                      border:1px solid rgba(251,140,0,.50);background:rgba(251,140,0,.14);
                      color:#ffcc80;font-size:1rem;cursor:pointer;`;

    const rows = this.prestamosActivos.map((p, idx) => {
      const dotColor  = this.alertaColor(p.alerta);
      const rowBg     = !p.turnoActivo ? 'background:rgba(239,68,68,0.08);' : '';
      const estadoTxt = p.turnoActivo ? 'Turno en curso' : 'Turno finalizado';
      const estadoClr = p.turnoActivo ? '#86efac' : '#fca5a5';
      const dias      = `${p.diasPrestado} día${p.diasPrestado !== 1 ? 's' : ''}`;
      return `
        <tr style="${rowBg}">
          <td style="padding:.5rem .75rem;vertical-align:middle;">
            <span style="display:inline-block;width:.6rem;height:.6rem;border-radius:50%;background:${dotColor};"></span>
          </td>
          <td style="padding:.5rem .75rem;">${p.nombreEmpleado}</td>
          <td style="padding:.5rem .75rem;">${p.nombreHerramienta}</td>
          <td style="padding:.5rem .75rem;text-align:center;">${this.getTurnoLabel(p.turno)}</td>
          <td style="padding:.5rem .75rem;text-align:center;color:${estadoClr};font-size:.75rem;">${estadoTxt}</td>
          <td style="padding:.5rem .75rem;text-align:right;color:rgba(255,255,255,.6);">${dias}</td>
          <td style="padding:.5rem .75rem;text-align:center;">
            <button class="btn-devolver-prestamo" data-idx="${idx}" style="${btnStyle}"
              onmouseover="this.style.background='rgba(251,140,0,.28)';this.style.transform='scale(1.10)'"
              onmouseout="this.style.background='rgba(251,140,0,.14)';this.style.transform='scale(1)'">
              <i class="bi bi-arrow-return-left"></i>
            </button>
          </td>
        </tr>`;
    }).join('');

    Swal.fire({
      title: `Préstamos activos &nbsp;<span style="font-size:1rem;font-weight:400;color:rgba(255,255,255,.6);">(${this.kpi.unidadesPrestadas})</span>`,
      html: `
        <div style="overflow-x:auto;max-height:60vh;overflow-y:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:.82rem;color:#fff;min-width:600px;">
            <thead>
              <tr style="background:rgba(15,20,70,.97);position:sticky;top:0;z-index:1;">
                <th style="${thStyle}"></th>
                <th style="${thStyle}text-align:left;">Empleado</th>
                <th style="${thStyle}text-align:left;">Herramienta</th>
                <th style="${thStyle}text-align:center;">Turno</th>
                <th style="${thStyle}text-align:center;">Estado</th>
                <th style="${thStyle}text-align:right;">Días</th>
                <th style="${thStyle}text-align:center;">Acción</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`,
      showConfirmButton: false,
      showCloseButton: true,
      width: '900px',
      background: 'rgba(15,20,70,0.97)',
      color: '#ffffff',
      didOpen: () => {
        document.querySelectorAll('.btn-devolver-prestamo').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt((btn as HTMLElement).dataset['idx'] ?? '0', 10);
            const prestamo = this.prestamosActivos[idx];
            Swal.close();
            this.devolverPrestamo(prestamo);
          });
        });
      }
    });
  }

  devolverPrestamo(p: any): void {
    const dto = {
      id: p.id,
      estatus: true,
      nombreEmpleado: p.nombreEmpleado,
      nombreHerramienta: p.nombreHerramienta
    };

    Swal.fire({
      html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Procesando devolución...<br><small>Por favor, espere.</small></p>',
      showConfirmButton: false,
      allowOutsideClick: false
    });

    this.bitacoraService.postactualizar(dto).subscribe({
      next: (response) => {
        this.loadDashboard();
        setTimeout(() => {
          Swal.fire({
            title: response?.message ?? '¡Herramienta devuelta!',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }, 150);
      },
      error: (err) => {
        Swal.fire({
          title: 'No se pudo actualizar',
          text: err?.error?.message ?? 'Ocurrió un error inesperado.',
          icon: 'error'
        });
      }
    });
  }

}
