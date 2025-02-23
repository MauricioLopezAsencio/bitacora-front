import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BitacoraService } from 'src/app/services/bitacora.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-herramienta',
  templateUrl: './herramienta.component.html',
  styleUrls: ['./herramienta.component.css'],
})
export class HerramientaComponent implements OnInit {

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
      name: ['', Validators.required]// Validators.required marca el campo como obligatorio
    });

    this.formularioEdit = this.fb.group({
      estatus: ['', Validators.required] // Solo estatus
    });
  }

  ngOnInit(): void {
    this.loadRegistros();
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

    this.bitacoraService.getHerramienta().subscribe(
      (data) => {
        this.products = data;
        console.log('Registros:', this.products);
        Swal.close();
      },
      (error) => {
        console.error('Error al cargar registros', error);
        Swal.close();
      }
    );


  }


  onSubmit() {
    console.log('Submit:', this.formulario.value)

    const saveHeraamienta: any = {
      nombre: this.formulario.get('name')?.value,
      categoria:'GENERICO',
      estatus: true
    }
    if (this.formulario.valid) {
      // Enviar datos al servicio
      this.bitacoraService.saveHerramienta(saveHeraamienta).subscribe(
        (response) => {

          Swal.fire({
            title: "¡Registro exitoso!",
            text: "",
            icon: "success"
          });

          this.loadRegistros();
          console.log('Datos enviados correctamente', response);
          this.formulario.reset();
        },
        (error) => {
          Swal.fire({
            title: "¡error",
            text: "",
            icon: "error"
          });
          console.error('Error al enviar datos', error);
          this.loadRegistros();
        }
      );
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

    this.bitacoraService.inactivarHerramienta(Number(nuevoEstatus)).subscribe(
      (response) => {
        // Actualiza el estatus en el objeto existente
        bitacora.estatus = response.estatus;
        console.log('Estatus actualizado:', response);
        Swal.close();
        this.loadRegistros();

      },
      (error) => {
        this.loadRegistros();
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
