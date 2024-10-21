import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BitacoraService } from 'src/app/services/bitacora.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-bitacora',
  templateUrl: './bitacora.component.html',
  styleUrls: ['./bitacora.component.css'],
})
export class BitacoraComponent implements OnInit {

  bitacorapg = []; // Asegúrate de que esta propiedad tenga los datos que necesitas
  p: number = 1; // Página actual
  itemsPerPage: number = 5;

  registros: any[] = [];
  products: any[] = [];
  bitacora: any[] = [];
  selectedBitacora: any = null;

  selectedRegistro: any;
  formulario: FormGroup;
  formularioEdit: FormGroup;

  constructor(private bitacoraService: BitacoraService, private fb: FormBuilder) {
    this.formulario = this.fb.group({
      empleadoId: ['', Validators.required], // Validators.required marca el campo como obligatorio
      herramientaId: ['', Validators.required], // Validators.required marca el campo como obligatorio
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
      title: 'Cargando...',
      text: 'Por favor, espere.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(); // Muestra el loader
      }
    });

    this.bitacoraService.getEmpleados().subscribe(
      (data) => {
        this.registros = data;
        console.log('Registros:', this.registros);
      },
      (error) => {
        console.error('Error al cargar registros', error);
      }
    );

    this.bitacoraService.getHerramienta().subscribe(
      (data) => {
        this.products = data;
        console.log('Registros:', this.products);
      },
      (error) => {
        console.error('Error al cargar registros', error);
      }
    );


  }
  getbitacora(): void {
    this.bitacoraService.getbitacora().subscribe(
      (data) => {
        this.bitacora = data.sort((a, b) => {
          return (a.estatus === false && b.estatus === true) ? -1 : (a.estatus === true && b.estatus === false) ? 1 : 0;
        });
        // Oculta el loader al finalizar la carga
        Swal.close();
        console.log('bitacora:', this.bitacora);
      },
      (error) => {
        console.error('Error al cargar registros', error);
      }
    );


  }

  onSubmit() {
    if (this.formulario.valid) {
      // Enviar datos al servicio
      this.bitacoraService.postAsignar(this.formulario.value).subscribe(
        (response) => {

          Swal.fire({
            title: "¡Registro exitoso!",
            text: "",
            icon: "success"
          });

          this.getbitacora();
          console.log('Datos enviados correctamente', response);
          this.formulario.reset();
        },
        (error) => {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "error!",
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

    this.bitacoraService.postactualizar(actualizarEstatusDto).subscribe(
      (response) => {
        // Actualiza el estatus en el objeto existente
        bitacora.estatus = response.estatus;
        console.log('Estatus actualizado:', response);
        Swal.close();
        this.getbitacora();

      },
      (error) => {
        this.getbitacora();
        Swal.fire({
          title: "¡Registro actualizado exitosomente!",
          text: "",
          icon: "success"
        });
      }
    );

  }

  onSelectRegistro(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedRegistro = this.registros[selectElement.selectedIndex]; // Obtén el registro seleccionado
    console.log('Registro seleccionado:', this.selectedRegistro);
  }


}
