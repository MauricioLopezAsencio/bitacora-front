import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { BitacoraService } from 'src/app/services/bitacora.service';
import { HerramientaRequestDto, HerramientaResponseDto } from 'src/app/models/herramienta.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-herramienta',
  templateUrl: './herramienta.component.html',
  styleUrls: ['./herramienta.component.css'],
})
export class HerramientaComponent implements OnInit {

  p: number = 1;
  itemsPerPage: number = 5;
  searchTerm: string = '';

  products: HerramientaResponseDto[] = [];

  get filteredProducts(): HerramientaResponseDto[] {
    if (!this.searchTerm.trim()) return this.products;
    const term = this.searchTerm.toLowerCase();
    return this.products.filter(h =>
      h.nombre?.toLowerCase().includes(term) ||
      String(h.id).includes(term)
    );
  }

  selectedHerramienta: HerramientaResponseDto | null = null;
  showEditModal: boolean = false;

  formulario: FormGroup;
  formularioEdit: FormGroup;

  createErrors: Record<string, string> = {};
  editErrors: Record<string, string> = {};

  constructor(private bitacoraService: BitacoraService, private fb: FormBuilder) {
    this.formulario = this.fb.group({
      nombre:        ['', Validators.required],
      categoria:     ['GENERICO', Validators.required],
      cantidadTotal: [null, [Validators.required, Validators.min(1), Validators.pattern('^[0-9]+$')]]
    });

    this.formularioEdit = this.fb.group({
      nombre:        ['', Validators.required],
      categoria:     ['', Validators.required],
      cantidadTotal: [null, [Validators.required, Validators.min(1), Validators.pattern('^[0-9]+$')]],
      estatus:       [true, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadRegistros();
  }

  loadRegistros(): void {
    Swal.fire({
      html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Cargando...<br><small>Por favor, espere.</small></p>',
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: () => {
        this.bitacoraService.getHerramienta().pipe(
          finalize(() => setTimeout(() => Swal.close(), 700))
        ).subscribe({
          next: (data: HerramientaResponseDto[]) => {
            this.products = data;
          },
          error: (error: any) => {
            console.error('Error al cargar registros', error);
          }
        });
      }
    });
  }

  onSubmit(): void {
    this.createErrors = {};
    if (this.formulario.invalid) return;

    const dto: HerramientaRequestDto = {
      nombre:        this.formulario.get('nombre')?.value,
      categoria:     this.formulario.get('categoria')?.value,
      cantidadTotal: Number(this.formulario.get('cantidadTotal')?.value),
      estatus:       true
    };

    this.bitacoraService.saveHerramienta(dto).subscribe({
      next: (response) => {
        Swal.fire({
          title: response?.message ?? '¡Herramienta registrada!',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        }).then(() => {
          this.formulario.reset({ categoria: 'GENERICO' });
          this.loadRegistros();
        });
      },
      error: (err) => {
        if (err?.status === 422 && err?.error?.validationErrors) {
          this.createErrors = err.error.validationErrors;
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

  openEditModal(herramienta: HerramientaResponseDto): void {
    this.selectedHerramienta = herramienta;
    this.editErrors = {};
    this.formularioEdit.reset({
      nombre:        herramienta.nombre,
      categoria:     herramienta.categoria,
      cantidadTotal: herramienta.cantidadTotal,
      estatus:       herramienta.estatus
    });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedHerramienta = null;
    this.editErrors = {};
  }

  get activeLoans(): number {
    if (!this.selectedHerramienta) return 0;
    return (this.selectedHerramienta.cantidadTotal ?? 0) - (this.selectedHerramienta.cantidadDisponible ?? 0);
  }

  get showCapacityWarning(): boolean {
    const newTotal = Number(this.formularioEdit.get('cantidadTotal')?.value);
    return !isNaN(newTotal) && newTotal > 0 && newTotal < this.activeLoans;
  }

  onEditSubmit(): void {
    this.editErrors = {};
    if (this.formularioEdit.invalid || !this.selectedHerramienta) return;

    const dto: HerramientaRequestDto = {
      nombre:        this.formularioEdit.get('nombre')?.value,
      categoria:     this.formularioEdit.get('categoria')?.value,
      cantidadTotal: Number(this.formularioEdit.get('cantidadTotal')?.value),
      estatus:       this.formularioEdit.get('estatus')?.value
    };

    this.bitacoraService.updateHerramienta(this.selectedHerramienta.id, dto).subscribe({
      next: (response) => {
        const updated: HerramientaResponseDto = response?.data ?? response;
        const idx = this.products.findIndex(h => h.id === this.selectedHerramienta!.id);
        if (idx !== -1 && updated?.id) {
          this.products[idx] = updated;
        } else {
          this.loadRegistros();
        }
        this.closeEditModal();
        Swal.fire({
          title: response?.message ?? '¡Herramienta actualizada!',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        });
      },
      error: (err) => {
        if (err?.status === 422 && err?.error?.validationErrors) {
          this.editErrors = err.error.validationErrors;
        } else if (err?.status === 409) {
          Swal.fire({
            title: 'No se pudo actualizar',
            text: err?.error?.message ?? 'Conflicto de negocio.',
            icon: 'warning'
          });
        } else {
          Swal.fire({
            title: 'No se pudo actualizar',
            text: err?.error?.message ?? 'Ocurrió un error inesperado.',
            icon: 'error'
          });
        }
      }
    });
  }

  confirmDelete(herramienta: HerramientaResponseDto): void {
    Swal.fire({
      title: '¿Eliminar herramienta?',
      text: `Se eliminará "${herramienta.nombre}" de forma permanente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d32f2f'
    }).then(result => {
      if (result.isConfirmed) {
        this.deleteHerramienta(herramienta);
      }
    });
  }

  private deleteHerramienta(herramienta: HerramientaResponseDto): void {
    this.bitacoraService.deleteHerramienta(herramienta.id).subscribe({
      next: () => {
        this.products = this.products.filter(h => h.id !== herramienta.id);
        Swal.fire({
          title: '¡Herramienta eliminada!',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        });
      },
      error: (err) => {
        const msg = err?.status === 409
          ? (err?.error?.message ?? 'No se puede eliminar la herramienta porque tiene préstamo(s) activo(s).')
          : (err?.error?.message ?? 'Ocurrió un error inesperado.');
        Swal.fire({
          title: 'No se pudo eliminar',
          text: msg,
          icon: 'error'
        });
      }
    });
  }

  toggleEstatus(herramienta: HerramientaResponseDto): void {
    this.bitacoraService.toggleEstatusHerramienta(herramienta.id).subscribe({
      next: (response) => {
        const updated: HerramientaResponseDto = response?.data ?? response;
        const idx = this.products.findIndex(h => h.id === herramienta.id);
        if (idx !== -1 && updated?.id) {
          this.products[idx] = updated;
        } else {
          this.loadRegistros();
        }
        Swal.fire({
          title: '¡Estatus actualizado!',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        });
      },
      error: () => {
        this.loadRegistros();
        Swal.fire({
          title: '¡Estatus actualizado!',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        });
      }
    });
  }
}
