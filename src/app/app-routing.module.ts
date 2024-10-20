import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BitacoraComponent } from './components/bitacora/bitacora.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { HerramientaComponent } from './components/herramienta/herramienta.component';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'herramienta', component: HerramientaComponent },
  { path: 'bitacora', component: BitacoraComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
