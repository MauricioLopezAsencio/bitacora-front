import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BitacoraService } from 'src/app/services/bitacora.service';

@Component({
  selector: 'app-bitacora',
  templateUrl: './bitacora.component.html',
  styleUrls: ['./bitacora.component.css'],
})
export class BitacoraComponent implements OnInit {
  registros: any[] = [];
  products: any[] = [];
  selectedRegistro: any;
  formulario: FormGroup;

  constructor(private bitacoraService: BitacoraService, private fb: FormBuilder) {
    this.formulario = this.fb.group({
      empleado: ['', Validators.required], // Validators.required marca el campo como obligatorio
      herramienta: ['', Validators.required], // Validators.required marca el campo como obligatorio
    });
  }

  ngOnInit(): void {
    this.loadRegistros();
  }

  loadRegistros(): void {
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
  onSubmit() {
    if (this.formulario.valid) {
      console.log('Formulario enviado', this.formulario.value);
    } else {
      console.log('Formulario inválido');
    }
  }
  onSelectRegistro(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedRegistro = this.registros[selectElement.selectedIndex]; // Obtén el registro seleccionado
    console.log('Registro seleccionado:', this.selectedRegistro);
  }
}
