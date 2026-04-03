import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { from, of } from 'rxjs';
import { concatMap, catchError, tap } from 'rxjs/operators';
import { ActividadService } from 'src/app/services/actividad.service';
import { MsalAuthService } from 'src/app/services/msal-auth.service';
import { ActividadItem, ActividadRequest } from 'src/app/models/actividad.model';

function fechasValidator(group: AbstractControl): ValidationErrors | null {
  const inicio = group.get('fechaInicio')?.value;
  const fin = group.get('fechaFin')?.value;
  if (inicio && fin && inicio > fin) {
    return { fechasInvalidas: true };
  }
  return null;
}

@Component({
  selector: 'app-actividad',
  templateUrl: './actividad.component.html',
  styleUrls: ['./actividad.component.css']
})
export class ActividadComponent implements OnInit, OnDestroy {

  formulario!: FormGroup;
  msAccountName: string | null = null;
  msLoading = false;
  showTokenInput = false;
  showPass = false;

  actividades: ActividadItem[] = [];
  sesionesNoPareadas: ActividadItem[] = [];
  hasResults = false;

  pAct = 1;
  pSin = 1;
  readonly itemsPerPage = 10;

  registrandoTodoAct = false;
  registrandoTodoSin = false;
  progresoAct = 0;
  progresoSin = 0;
  totalAct = 0;
  totalSin = 0;

  // Credenciales Bitácora guardadas en memoria (nunca en localStorage)
  private credencialesSco: { username: string; password: string } | null = null;

  constructor(
    private fb: FormBuilder,
    private actividadService: ActividadService,
    private msalAuth: MsalAuthService
  ) {}

  ngOnInit(): void {
    this.formulario = this.fb.group(
      {
        tokenMicrosoft: ['', Validators.required],
        username:       ['', Validators.required],
        password:       ['', Validators.required],
        fechaInicio:    ['', Validators.required],
        fechaFin:       ['', Validators.required]
      },
      { validators: fechasValidator }
    );

    this.msalAuth.getAccountName().then(name => {
      this.msAccountName = name;
    }).catch(() => {});
  }

  ngOnDestroy(): void {
    // Limpiar credenciales de memoria al salir del componente
    this.credencialesSco = null;
  }

  // ─── Microsoft ────────────────────────────────────────────────────────────

  async conectarMicrosoft(): Promise<void> {
    this.msLoading = true;
    Swal.fire({
      html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Conectando con Microsoft...<br><small>Se abrirá una ventana de autenticación.</small></p>',
      showConfirmButton: false,
      allowOutsideClick: false
    });
    try {
      const token = await this.msalAuth.acquireToken();
      this.formulario.patchValue({ tokenMicrosoft: token });
      const name = await this.msalAuth.getAccountName();
      this.msAccountName = name;
      Swal.fire({
        title: '¡Conectado con Microsoft!',
        text: name ?? 'Token obtenido exitosamente.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire({
        title: 'Error al conectar con Microsoft',
        text: err?.message ?? 'No se pudo obtener el token.',
        icon: 'error'
      });
    } finally {
      this.msLoading = false;
    }
  }

  async desconectarMicrosoft(): Promise<void> {
    try {
      await this.msalAuth.logout();
      this.msAccountName = null;
      this.formulario.patchValue({ tokenMicrosoft: '' });
      Swal.fire({ title: 'Sesión de Microsoft cerrada', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire({ title: 'Error al desconectar', text: err?.message, icon: 'error' });
    }
  }

  // ─── Consulta ─────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const raw = this.formulario.value;
    const req: ActividadRequest = { ...raw };

    Swal.fire({
      html: '<i class="bi bi-gear-fill swal-gear"></i><p class="swal-loading-text">Consultando actividades...<br><small>Por favor, espere.</small></p>',
      showConfirmButton: false,
      allowOutsideClick: false
    });

    this.actividadService.consultar(req).subscribe({
      next: (resp) => {
        Swal.close();
        this.actividades        = resp?.data?.actividades                 ?? [];
        this.sesionesNoPareadas = resp?.data?.sesionesNoPareadasAProyecto ?? [];
        this.hasResults = true;
        this.pAct = 1;
        this.pSin = 1;
        // Guardar credenciales en memoria para los registros posteriores
        this.credencialesSco = { username: raw.username, password: raw.password };
      },
      error: (err) => {
        const status = err?.status;
        if (status === 400) {
          const errors = err?.error?.validationErrors as Record<string, string> | undefined;
          const html = errors
            ? Object.values(errors).map(e => `<p style="margin:0.2rem 0">${e}</p>`).join('')
            : 'Verifique los datos enviados.';
          Swal.fire({ title: 'Datos inválidos', html, icon: 'warning' });
        } else {
          Swal.fire({
            title: 'Error al consultar actividades',
            text: err?.error?.message ?? 'Ocurrió un error inesperado.',
            icon: 'error'
          });
        }
      }
    });
  }

  // ─── Getters pendientes ────────────────────────────────────────────────────

  get pendientesAct(): ActividadItem[] {
    return this.actividades.filter(i => !i.registrado && !i.registrando);
  }

  get pendientesSin(): ActividadItem[] {
    return this.sesionesNoPareadas.filter(i => !i.registrado && !i.registrando && !!i.proyectoSeleccionado);
  }

  // ─── Registro individual ───────────────────────────────────────────────────

  private buildBody(item: ActividadItem): object {
    return {
      username:        this.credencialesSco!.username,
      password:        this.credencialesSco!.password,
      idActividad:     item.idActividad,
      idTipoActividad: item.idTipoActividad,
      idProyecto:      item.proyectoSeleccionado ?? item.idProyecto,
      descripcion:     item.descripcion,
      fechaRegistro:   item.fechaRegistro,
      horaInicio:      item.horaInicio,
      horaFin:         item.horaFin
    };
  }

  registrarActividad(item: ActividadItem): void {
    if (!this.credencialesSco) return;

    item.registrando = true;

    this.actividadService.registrar(this.buildBody(item)).subscribe({
      next: () => {
        item.registrando = false;
        item.registrado  = true;
        Swal.fire({
          title: '¡Actividad registrada!',
          text: 'La actividad se registró correctamente en Bitácora.',
          icon: 'success',
          timer: 1800,
          showConfirmButton: false
        });
      },
      error: (err) => {
        item.registrando = false;
        Swal.fire({
          title: 'Error al registrar actividad',
          text: err?.error?.message ?? 'Ocurrió un error inesperado.',
          icon: 'error'
        });
      }
    });
  }

  // ─── Registro masivo ───────────────────────────────────────────────────────

  registrarTodasActividades(): void {
    if (!this.credencialesSco || this.registrandoTodoAct) return;
    const pendientes = [...this.pendientesAct];
    if (pendientes.length === 0) return;

    this.registrandoTodoAct = true;
    this.progresoAct = 0;
    this.totalAct = pendientes.length;
    let erroresAct = 0;

    from(pendientes).pipe(
      concatMap(item => {
        item.registrando = true;
        return this.actividadService.registrar(this.buildBody(item)).pipe(
          tap(() => { item.registrando = false; item.registrado = true; this.progresoAct++; }),
          catchError(() => { item.registrando = false; erroresAct++; return of(null); })
        );
      })
    ).subscribe({
      complete: () => {
        this.registrandoTodoAct = false;
        if (erroresAct === 0) {
          Swal.fire({
            title: '¡Registro masivo completado!',
            text: `${this.progresoAct} actividad${this.progresoAct !== 1 ? 'es registradas' : ' registrada'} exitosamente.`,
            icon: 'success',
            timer: 2500,
            showConfirmButton: false
          });
        } else {
          Swal.fire({
            title: 'Registro completado con advertencias',
            html: `<p><strong>${this.progresoAct}</strong> registrada${this.progresoAct !== 1 ? 's' : ''} correctamente.</p>
                   <p><strong>${erroresAct}</strong> con error — revisa los registros pendientes.</p>`,
            icon: 'warning'
          });
        }
      }
    });
  }

  registrarTodasSesiones(): void {
    if (!this.credencialesSco || this.registrandoTodoSin) return;
    const pendientes = [...this.pendientesSin];
    if (pendientes.length === 0) return;

    this.registrandoTodoSin = true;
    this.progresoSin = 0;
    this.totalSin = pendientes.length;
    let erroresSin = 0;

    from(pendientes).pipe(
      concatMap(item => {
        item.registrando = true;
        return this.actividadService.registrar(this.buildBody(item)).pipe(
          tap(() => { item.registrando = false; item.registrado = true; this.progresoSin++; }),
          catchError(() => { item.registrando = false; erroresSin++; return of(null); })
        );
      })
    ).subscribe({
      complete: () => {
        this.registrandoTodoSin = false;
        if (erroresSin === 0) {
          Swal.fire({
            title: '¡Registro masivo completado!',
            text: `${this.progresoSin} sesión${this.progresoSin !== 1 ? 'es registradas' : ' registrada'} exitosamente.`,
            icon: 'success',
            timer: 2500,
            showConfirmButton: false
          });
        } else {
          Swal.fire({
            title: 'Registro completado con advertencias',
            html: `<p><strong>${this.progresoSin}</strong> registrada${this.progresoSin !== 1 ? 's' : ''} correctamente.</p>
                   <p><strong>${erroresSin}</strong> con error — revisa los registros pendientes.</p>`,
            icon: 'warning'
          });
        }
      }
    });
  }

  // ─── Helpers template ─────────────────────────────────────────────────────

  tipoLabel(item: ActividadItem): string {
    return item.idActividad === 1 ? 'Interna' : 'Externa';
  }

  field(name: string) {
    return this.formulario.get(name);
  }

  get puedeRegistrar(): boolean {
    return this.credencialesSco !== null;
  }
}
