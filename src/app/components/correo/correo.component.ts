import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { CorreoService } from 'src/app/services/correo.service';
import { CorreoDestinatario, CorreoDestinatarioRequest } from 'src/app/models/correo.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-correo',
  templateUrl: './correo.component.html',
  styleUrls: ['./correo.component.css']
})
export class CorreoComponent implements OnInit {

  destinatarios: CorreoDestinatario[] = [];
  p: number = 1;
  itemsPerPage: number = 8;
  searchTerm: string = '';

  showModal = false;
  isEditing = false;
  editingId: number | null = null;
  formErrors: Record<string, string> = {};

  formulario!: FormGroup;

  get filteredDestinatarios(): CorreoDestinatario[] {
    if (!this.searchTerm.trim()) return this.destinatarios;
    const term = this.searchTerm.toLowerCase();
    return this.destinatarios.filter(d =>
      d.dsNombre?.toLowerCase().includes(term) ||
      d.dsCorreo?.toLowerCase().includes(term)
    );
  }

  constructor(private correoService: CorreoService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
    this.loadDestinatarios();
  }

  private initForm(): void {
    this.formulario = this.fb.group({
      dsNombre:       ['', [Validators.required, Validators.maxLength(255)]],
      dsCorreo:       ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      boActivo:       [true],
      boRecordatorios:[false],
      boBitacora:     [false],
    });
  }

  loadDestinatarios(): void {
    Swal.fire({
      html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Cargando...<br><small>Por favor, espere.</small></p>',
      showConfirmButton: false,
      allowOutsideClick: false
    });

    this.correoService.getAll().pipe(
      finalize(() => setTimeout(() => Swal.close(), 500))
    ).subscribe({
      next: (data) => { this.destinatarios = data; },
      error: () => {
        Swal.fire({ title: 'Error al cargar destinatarios', icon: 'error', timer: 2000, showConfirmButton: false });
      }
    });
  }

  openCreate(): void {
    this.isEditing = false;
    this.editingId = null;
    this.formErrors = {};
    this.formulario.reset({ boActivo: true, boRecordatorios: false, boBitacora: false });
    this.showModal = true;
  }

  openEdit(dest: CorreoDestinatario): void {
    this.isEditing = true;
    this.editingId = dest.id;
    this.formErrors = {};
    this.formulario.reset({
      dsNombre:        dest.dsNombre,
      dsCorreo:        dest.dsCorreo,
      boActivo:        dest.boActivo,
      boRecordatorios: dest.boRecordatorios,
      boBitacora:      dest.boBitacora,
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formErrors = {};
  }

  onSubmit(): void {
    this.formErrors = {};
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const dto: CorreoDestinatarioRequest = this.formulario.value;
    const request$ = this.isEditing && this.editingId !== null
      ? this.correoService.update(this.editingId, dto)
      : this.correoService.create(dto);

    this.closeModal();

    Swal.fire({
      html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Guardando...<br><small>Por favor, espere.</small></p>',
      showConfirmButton: false,
      allowOutsideClick: false
    });

    request$.subscribe({
      next: (response) => {
        this.loadDestinatarios();
        setTimeout(() => {
          Swal.fire({
            title: response?.message ?? (this.isEditing ? '¡Destinatario actualizado!' : '¡Destinatario registrado!'),
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }, 150);
      },
      error: (err) => {
        if (err?.status === 422 && err?.error?.validationErrors) {
          this.formErrors = err.error.validationErrors;
          this.showModal = true;
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

  confirmDelete(dest: CorreoDestinatario): void {
    Swal.fire({
      title: '¿Eliminar destinatario?',
      text: `Se eliminará "${dest.dsNombre}" de forma permanente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d32f2f'
    }).then(result => {
      if (!result.isConfirmed) return;

      Swal.fire({
        html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Eliminando...<br><small>Por favor, espere.</small></p>',
        showConfirmButton: false,
        allowOutsideClick: false
      });

      this.correoService.delete(dest.id).subscribe({
        next: (response) => {
          this.destinatarios = this.destinatarios.filter(d => d.id !== dest.id);
          setTimeout(() => {
            Swal.fire({
              title: response?.message ?? '¡Destinatario eliminado!',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          }, 150);
        },
        error: (err) => {
          Swal.fire({
            title: 'No se pudo eliminar',
            text: err?.error?.message ?? 'Ocurrió un error inesperado.',
            icon: 'error'
          });
        }
      });
    });
  }

  toggleActivo(dest: CorreoDestinatario): void {
    this.correoService.toggleActivo(dest.id).subscribe({
      next: (response) => {
        const updated: CorreoDestinatario = response?.data ?? response;
        const idx = this.destinatarios.findIndex(d => d.id === dest.id);
        if (idx !== -1 && updated?.id) {
          this.destinatarios[idx] = updated;
        } else {
          dest.boActivo = !dest.boActivo;
        }
      },
      error: () => {
        dest.boActivo = !dest.boActivo;
      }
    });
  }
}
