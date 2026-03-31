import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BitacoraComponent } from './components/bitacora/bitacora.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { EmpleadoComponent } from './components/empleado/empleado.component';
import { HerramientaComponent } from './components/herramienta/herramienta.component';
import { LoginComponent } from './components/login/login.component';
import { CorreoComponent } from './components/correo/correo.component';
import { ConfiguracionComponent } from './components/configuracion/configuracion.component';
import { authGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '',                      component: DashboardComponent,   canActivate: [authGuard] },
  { path: 'herramienta',           component: HerramientaComponent, canActivate: [authGuard] },
  { path: 'bitacora',              component: BitacoraComponent,     canActivate: [authGuard] },
  { path: 'empleado',              component: EmpleadoComponent,     canActivate: [authGuard] },
  { path: 'configuracion',         component: ConfiguracionComponent, canActivate: [authGuard] },
  { path: 'configuracion/correos', component: CorreoComponent,        canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: false })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
