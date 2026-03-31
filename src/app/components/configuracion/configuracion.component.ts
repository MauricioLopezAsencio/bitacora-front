import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { BitacoraService } from 'src/app/services/bitacora.service';
import { TurnoConfig, TurnoConfigRequest, RecordatorioConfig, RecordatorioConfigRequest } from 'src/app/models/turno.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.css']
})
export class ConfiguracionComponent implements OnInit {

  turnos: TurnoConfig[] = [];

  showModalTurno = false;
  editingTurno: TurnoConfig | null = null;
  turnoForm!: FormGroup;

  recordatorioForm!: FormGroup;

  constructor(private bitacoraService: BitacoraService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.turnoForm = this.fb.group({
      horaInicio: [null, [Validators.required, Validators.min(0), Validators.max(23)]],
      horaFin:    [null, [Validators.required, Validators.min(0), Validators.max(23)]],
    });

    this.recordatorioForm = this.fb.group({
      minutosRecordatorio: [15, [Validators.required, Validators.min(1), Validators.max(120)]],
    });

    this.loadData();
  }

  loadData(): void {
    Swal.fire({
      html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Cargando configuración...<br><small>Por favor, espere.</small></p>',
      showConfirmButton: false,
      allowOutsideClick: false
    });

    forkJoin({
      turnos:       this.bitacoraService.getTurnos(),
      recordatorio: this.bitacoraService.getRecordatorio()
    }).pipe(
      finalize(() => setTimeout(() => Swal.close(), 300))
    ).subscribe({
      next: ({ turnos, recordatorio }) => {
        this.turnos = turnos;
        this.recordatorioForm.patchValue({ minutosRecordatorio: recordatorio.minutosRecordatorio });
      },
      error: () => {
        Swal.fire({ title: 'Error al cargar configuración', icon: 'error', timer: 2000, showConfirmButton: false });
      }
    });
  }

  openEditTurno(turno: TurnoConfig): void {
    this.editingTurno = turno;
    this.turnoForm.reset({
      horaInicio: turno.horaInicio,
      horaFin:    turno.horaFin,
    });
    this.showModalTurno = true;
  }

  closeModalTurno(): void {
    this.showModalTurno = false;
    this.editingTurno = null;
  }

  get isNocturnoError(): boolean {
    if (this.editingTurno?.cvTurno !== 'NOCTURNO') return false;
    const c = this.turnoForm.controls;
    if (c['horaInicio'].invalid || c['horaFin'].invalid) return false;
    return Number(c['horaFin'].value) >= Number(c['horaInicio'].value);
  }

  onSubmitTurno(): void {
    if (this.turnoForm.invalid || !this.editingTurno) return;
    if (this.isNocturnoError) return;

    const turnoId = this.editingTurno.id;
    const dto: TurnoConfigRequest = {
      horaInicio: Number(this.turnoForm.value.horaInicio),
      horaFin:    Number(this.turnoForm.value.horaFin),
    };

    this.closeModalTurno();

    Swal.fire({
      title: '¿Guardar cambios?',
      text: 'Los préstamos ya activos no se verán afectados. Solo aplica a nuevas asignaciones.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Entendido, guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1565c0',
    }).then(result => {
      if (!result.isConfirmed) return;

      Swal.fire({
        html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Guardando...<br><small>Por favor, espere.</small></p>',
        showConfirmButton: false,
        allowOutsideClick: false
      });

      this.bitacoraService.updateTurno(turnoId, dto).subscribe({
        next: (response) => {
          this.refreshTurnos();
          setTimeout(() => {
            Swal.fire({
              title: response?.message ?? '¡Turno actualizado!',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          }, 150);
        },
        error: (err) => {
          Swal.fire({
            title: 'No se pudo guardar',
            text: err?.error?.message ?? 'Ocurrió un error inesperado.',
            icon: 'error'
          });
        }
      });
    });
  }

  private refreshTurnos(): void {
    this.bitacoraService.getTurnos().subscribe({
      next: (data) => { this.turnos = data; },
      error: () => {}
    });
  }

  onSubmitRecordatorio(): void {
    if (this.recordatorioForm.invalid) return;

    Swal.fire({
      html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Guardando...<br><small>Por favor, espere.</small></p>',
      showConfirmButton: false,
      allowOutsideClick: false
    });

    const dto: RecordatorioConfigRequest = this.recordatorioForm.value;

    this.bitacoraService.saveRecordatorio(dto).subscribe({
      next: (response) => {
        setTimeout(() => {
          Swal.fire({
            title: response?.message ?? '¡Recordatorio actualizado!',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }, 150);
      },
      error: (err) => {
        Swal.fire({
          title: 'No se pudo guardar',
          text: err?.error?.message ?? 'Ocurrió un error inesperado.',
          icon: 'error'
        });
      }
    });
  }

  getTurnoLabel(nombre: string): string {
    const map: Record<string, string> = {
      MATUTINO:   '☀️ MATUTINO',
      VESPERTINO: '🌅 VESPERTINO',
      NOCTURNO:   '🌙 NOCTURNO',
    };
    return map[nombre] ?? nombre;
  }

  getTurnoBadgeClass(nombre: string): string {
    const map: Record<string, string> = {
      MATUTINO:   'turno-badge matutino',
      VESPERTINO: 'turno-badge vespertino',
      NOCTURNO:   'turno-badge nocturno',
    };
    return map[nombre] ?? 'turno-badge';
  }

  padHora(h: number): string {
    return (h ?? 0).toString().padStart(2, '0') + ':00';
  }
}
