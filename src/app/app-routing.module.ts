import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BitacoraComponent } from './components/bitacora/bitacora.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { EmpleadoComponent } from './components/empleado/empleado.component';
import { HerramientaComponent } from './components/herramienta/herramienta.component';
import { LoginComponent } from './components/login/login.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '',          component: DashboardComponent,  canActivate: [AuthGuard] },
  { path: 'herramienta', component: HerramientaComponent, canActivate: [AuthGuard] },
  { path: 'bitacora',    component: BitacoraComponent,    canActivate: [AuthGuard] },
  { path: 'empleado',    component: EmpleadoComponent,    canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: false })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
