import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { BitacoraService } from 'src/app/services/bitacora.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-bitacora',
  templateUrl: './bitacora.component.html',
  styleUrls: ['./bitacora.component.css'],
})
export class BitacoraComponent implements OnInit {

  bitacorapg = [];
  p: number = 1;
  itemsPerPage: number = 5;
  searchTerm: string = '';

  registros: any[] = [];
  products: any[] = [];
  bitacora: any[] = [];

  get filteredBitacora(): any[] {
    let result = this.bitacora;
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(b =>
        b.nombreEmpleado?.toLowerCase().includes(term) ||
        b.nombreHerramienta?.toLowerCase().includes(term) ||
        b.fecha?.toLowerCase().includes(term)
      );
    }
    if (this.filtroTurno) {
      result = result.filter(b => b.turno === this.filtroTurno);
    }
    return result;
  }
  selectedBitacora: any = null;

  selectedCities!: any[];

  selectedRegistro: any;
  formulario: FormGroup;
  formularioEdit: FormGroup;

  filtroTurno: string = '';

  turnoOptions = [
    { label: '☀️ MATUTINO', value: 'MATUTINO' },
    { label: '🌅 VESPERTINO', value: 'VESPERTINO' },
    { label: '🌙 NOCTURNO', value: 'NOCTURNO' },
  ];

  private getTurnoActual(): string {
    const hourMX = parseInt(
      new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        hour: 'numeric',
        hour12: false,
      }).format(new Date()),
      10
    );
    if (hourMX >= 6 && hourMX < 14) return 'MATUTINO';
    if (hourMX >= 14 && hourMX < 22) return 'VESPERTINO';
    return 'NOCTURNO';
  }

  constructor(private bitacoraService: BitacoraService, private fb: FormBuilder,private cdr: ChangeDetectorRef) {
    this.formulario = this.fb.group({
      empleadoId: ['', Validators.required],
      herramientaId: ['', Validators.required],
      turno: [this.getTurnoActual(), Validators.required],
    });

    this.formularioEdit = this.fb.group({
      estatus: ['', Validators.required] // Solo estatus
    });
  }

  ngOnInit(): void {
    this.loadRegistros();
    this.getbitacora();
  }

  loadRegistros(): void {
    // Mostrar el SweetAlert con loader
    Swal.fire({
      html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Cargando...<br><small>Por favor, espere.</small></p>',
      showConfirmButton: false,
      allowOutsideClick: false
    });

    this.bitacoraService.getEmpleados().subscribe(
      (data) => {
        this.registros = data.map((empleado) => ({
          id: empleado.id,
          nombre: empleado.nombre,
        }));
        console.log('Registros:', this.registros);
      },
      (error) => {
        console.error('Error al cargar registros', error);
      }
    );

    this.bitacoraService.productsActivos().subscribe(
      (data) => {
        this.products = data.map((product) => ({
          herramientaId: product.id,
          nombre: product.nombre,
        }));
        console.log('Registros:', this.products);
      },
      (error) => {
        console.error('Error al cargar registros', error);
      }
    );


  }
  getbitacora(): void {
    this.bitacoraService.getbitacora().pipe(
      finalize(() => setTimeout(() => Swal.close(), 150))
    ).subscribe(
      (data) => {
        this.bitacora = (data ?? []).sort((a: any, b: any) => {
          return (a.estatus === false && b.estatus === true) ? -1 : (a.estatus === true && b.estatus === false) ? 1 : 0;
        });
        console.log('bitacora:', this.bitacora);
      },
      (error) => {
        console.error('Error al cargar registros', error);
      }
    );
  }

  onSubmit() {
    console.log("Formulario:", this.formulario.value);
    if (this.formulario.valid) {
      Swal.fire({
        html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Guardando registro...<br><small>Por favor, espere.</small></p>',
        showConfirmButton: false,
        allowOutsideClick: false
      });

      this.bitacoraService.postAsignar(this.formulario.value).subscribe(
        (response) => {
          this.formulario.reset();
          this.bitacoraService.getbitacora().pipe(
            finalize(() => setTimeout(() => {
              Swal.fire({
                title: response?.message ?? '¡Registro exitoso!',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              });
            }, 150))
          ).subscribe((data) => {
            this.bitacora = (data ?? []).sort((a: any, b: any) =>
              (a.estatus === false && b.estatus === true) ? -1 :
              (a.estatus === true  && b.estatus === false) ? 1 : 0
            );
          });
          console.log('Datos enviados correctamente', response);
        },
        (error) => {
          Swal.fire({
            icon: 'error',
            title: 'No se pudo asignar',
            text: error?.error?.message ?? 'Ocurrió un error inesperado.'
          });
          console.error('Error al enviar datos', error);
        }
      );
    } else {
      console.log('Formulario inválido');
    }
  }

  // Método para seleccionar el registro para editar
  toggleEstatus(bitacora: any) {
  
    this.selectedBitacora = bitacora;

    const nuevoEstatus = !bitacora.estatus; // Cambia el estatus
    const actualizarEstatusDto: any = {
      id: bitacora.id,
      estatus: true,
      nombreEmpleado: bitacora.nombreEmpleado,
      nombreHerramienta: bitacora.nombreHerramienta
    };

    // Imprimir el registro seleccionado en la consola
    console.log('Registro seleccionado:', nuevoEstatus);

    Swal.fire({
      html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Procesando devolución...<br><small>Por favor, espere.</small></p>',
      showConfirmButton: false,
      allowOutsideClick: false
    });

    this.bitacoraService.postactualizar(actualizarEstatusDto).subscribe({
      next: (response) => {
        this.bitacoraService.getbitacora().pipe(
          finalize(() => setTimeout(() => {
            Swal.fire({
              title: response?.message ?? '¡Registro actualizado!',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          }, 150))
        ).subscribe((data) => {
          this.bitacora = (data ?? []).sort((a: any, b: any) =>
            (a.estatus === false && b.estatus === true) ? -1 :
            (a.estatus === true  && b.estatus === false) ? 1 : 0
          );
        });
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

  /**
   * Devuelve true cuando ya pasaron 8 h desde el inicio del turno.
   * MATUTINO  → inicia 06:00, finaliza 14:00
   * VESPERTINO → inicia 14:00, finaliza 22:00
   * NOCTURNO  → inicia 22:00, finaliza 06:00 del día siguiente
   */
  esTurnoVencido(fecha: string, turno: string): boolean {
    if (!fecha) return false;
    const base = new Date(fecha + 'T00:00:00');
    let startHour: number;
    if (turno === 'MATUTINO') startHour = 6;
    else if (turno === 'VESPERTINO') startHour = 14;
    else startHour = 22; // NOCTURNO
    base.setHours(startHour, 0, 0, 0);
    const fin = new Date(base.getTime() + 8 * 60 * 60 * 1000);
    return new Date() > fin;
  }

  onSelectRegistro(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedRegistro = this.registros[selectElement.selectedIndex]; // Obtén el registro seleccionado
    console.log('Registro seleccionado:', this.selectedRegistro);
  }


}
