import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { BitacoraService } from 'src/app/services/bitacora.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-herramienta',
  templateUrl: './herramienta.component.html',
  styleUrls: ['./herramienta.component.css'],
})
export class HerramientaComponent implements OnInit {

  bitacorapg = [];
  p: number = 1;
  itemsPerPage: number = 5;
  searchTerm: string = '';

  registros: any[] = [];
  products: any[] = [];

  get filteredProducts(): any[] {
    if (!this.searchTerm.trim()) return this.products;
    const term = this.searchTerm.toLowerCase();
    return this.products.filter(h =>
      h.nombre?.toLowerCase().includes(term) ||
      String(h.id).includes(term)
    );
  }
  bitacora: any[] = [];
  selectedBitacora: any = null;

  selectedRegistro: any;
  formulario: FormGroup;
  formularioEdit: FormGroup;

  constructor(private bitacoraService: BitacoraService, private fb: FormBuilder) {
    this.formulario = this.fb.group({
      name:           ['', Validators.required],
      cantidadTotal:  [null, [Validators.required, Validators.min(1), Validators.pattern('^[0-9]+$')]]
    });

    this.formularioEdit = this.fb.group({
      estatus: ['', Validators.required] // Solo estatus
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
          next: (data) => {
            this.products = data;
            console.log('Registros:', this.products);
          },
          error: (error) => {
            console.error('Error al cargar registros', error);
          }
        });
      }
    });
  }


  onSubmit() {
    console.log('Submit:', this.formulario.value)

    const saveHeraamienta: any = {
      nombre:         this.formulario.get('name')?.value,
      cantidadTotal:  Number(this.formulario.get('cantidadTotal')?.value),
      categoria:      'GENERICO',
      estatus:        true
    }
    if (this.formulario.valid) {
      // Enviar datos al servicio
      this.bitacoraService.saveHerramienta(saveHeraamienta).subscribe({
        next: (response) => {
          console.log('Datos enviados correctamente', response);
          Swal.fire({
            title: response?.message ?? '¡Herramienta registrada!',
            icon: 'success',
            timer: 2500,
            showConfirmButton: false
          }).then(() => {
            this.formulario.reset();
            this.loadRegistros();
          });
        },
        error: (err) => {
          console.error('Error al enviar datos', err);
          Swal.fire({
            title: 'No se pudo guardar',
            text: err?.error?.message ?? 'Ocurrió un error inesperado.',
            icon: 'error'
          });
        }
      });
    } else {
      console.log('Formulario inválido');
    }
  }

  // Método para seleccionar el registro para editar
  toggleEstatus(bitacora: any) {

    this.selectedBitacora = bitacora;

    const nuevoEstatus = bitacora.id; // Cambia el estatus
    const actualizarEstatusDto: any = {
      id: bitacora.id,
      estatus: true,
      nombreEmpleado: bitacora.nombreEmpleado,
      nombreHerramienta: bitacora.nombreHerramienta
    };

    // Imprimir el registro seleccionado en la consola
    console.log('Registro seleccionado:', actualizarEstatusDto);
    console.log('Registro nuevoEstatus:', nuevoEstatus);

    this.bitacoraService.inactivarHerramienta(Number(nuevoEstatus)).subscribe({
      next: (response) => {
        console.log('Estatus actualizado:', response);
        Swal.fire({
          title: '¡Herramienta actualizada!',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        }).then(() => this.loadRegistros());
      },
      error: () => {
        Swal.fire({
          title: '¡Herramienta actualizada!',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        }).then(() => this.loadRegistros());
      }
    });

  }

  onSelectRegistro(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedRegistro = this.registros[selectElement.selectedIndex]; // Obtén el registro seleccionado
    console.log('Registro seleccionado:', this.selectedRegistro);
  }
}
