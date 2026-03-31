import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { BitacoraService } from 'src/app/services/bitacora.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-empleado',
  templateUrl: './empleado.component.html',
  styleUrls: ['./empleado.component.css']
})
export class EmpleadoComponent implements OnInit {

  empleados: any[] = [];
  p: number = 1;
  itemsPerPage: number = 8;
  searchTerm: string = '';

  get filteredEmpleados(): any[] {
    if (!this.searchTerm.trim()) return this.empleados;
    const term = this.searchTerm.toLowerCase();
    return this.empleados.filter(e =>
      e.nombre?.toLowerCase().includes(term) ||
      String(e.nomina).includes(term) ||
      String(e.id).includes(term)
    );
  }

  formulario: FormGroup;

  constructor(
    private bitacoraService: BitacoraService,
    private fb: FormBuilder
  ) {
    this.formulario = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      nomina: [null, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadEmpleados();
  }

  loadEmpleados(): void {
    Swal.fire({
      html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Cargando...<br><small>Por favor, espere.</small></p>',
      showConfirmButton: false,
      allowOutsideClick: false
    });

    this.bitacoraService.getEmpleados().pipe(
      finalize(() => setTimeout(() => Swal.close(), 700))
    ).subscribe({
      next: (data) => { this.empleados = data; },
      error: (err) => console.error('Error al cargar empleados', err)
    });
  }

  onSubmit(): void {
    if (this.formulario.invalid) return;

    const dto = {
      nombre: this.formulario.get('nombre')?.value,
      nomina: Number(this.formulario.get('nomina')?.value)
    };

    this.bitacoraService.saveEmpleado(dto).subscribe({
      next: (response) => {
        Swal.fire({
          title: response?.message ?? '¡Empleado registrado!',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        }).then(() => {
          this.formulario.reset();
          this.loadEmpleados();
        });
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

  editar(empleado: any): void {
    Swal.fire({
      title: 'Editar empleado',
      html: `
        <div style="text-align:left; margin-bottom:.5rem;">
          <label style="font-size:.8rem; color:#aaa; display:block; margin-bottom:.2rem;">Nombre</label>
          <input id="swal-nombre" class="swal2-input"
                 value="${empleado.nombre}" placeholder="Nombre completo"
                 style="margin:.0 0 .6rem; height:2.2rem; font-size:.88rem; padding:.35rem .65rem; width:100%; box-sizing:border-box;">
          <label style="font-size:.8rem; color:#aaa; display:block; margin-bottom:.2rem;">Nómina</label>
          <input id="swal-nomina" type="number" class="swal2-input"
                 value="${empleado.nomina}" placeholder="Número de nómina"
                 style="margin:0; height:2.2rem; font-size:.88rem; padding:.35rem .65rem; width:100%; box-sizing:border-box;">
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const nombre = (document.getElementById('swal-nombre') as HTMLInputElement).value.trim();
        const nominaRaw = (document.getElementById('swal-nomina') as HTMLInputElement).value;
        const nomina = Number(nominaRaw);
        if (!nombre || nombre.length < 2) {
          Swal.showValidationMessage('El nombre debe tener al menos 2 caracteres.');
          return false;
        }
        if (!nominaRaw || nomina < 1) {
          Swal.showValidationMessage('Ingresa un número de nómina válido.');
          return false;
        }
        return { nombre, nomina };
      }
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.bitacoraService.actualizarEmpleado(empleado.id, result.value).subscribe({
        next: (response) => {
          Swal.fire({
            title: response?.message ?? '¡Empleado actualizado!',
            icon: 'success',
            timer: 2500,
            showConfirmButton: false
          }).then(() => this.loadEmpleados());
        },
        error: (err) => {
          Swal.fire({
            title: 'No se pudo actualizar',
            text: err?.error?.message ?? 'Ocurrió un error inesperado.',
            icon: 'error'
          });
        }
      });
    });
  }

  eliminar(empleado: any): void {
    Swal.fire({
      title: '¿Eliminar empleado?',
      text: `Se eliminará a "${empleado.nombre}" de forma permanente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e53935'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.bitacoraService.eliminarEmpleado(Number(empleado.id)).subscribe({
        next: (response) => {
          Swal.fire({
            title: response?.message ?? '¡Empleado eliminado!',
            icon: 'success',
            timer: 2500,
            showConfirmButton: false
          }).then(() => this.loadEmpleados());
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
}
