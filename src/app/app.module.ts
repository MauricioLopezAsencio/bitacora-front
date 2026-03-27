import { NgModule } from "@angular/core";
import { AppComponent } from "./app.component";
import { BitacoraComponent } from "./components/bitacora/bitacora.component";
import { HerramientaComponent } from "./components/herramienta/herramienta.component";
import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { EmpleadoComponent } from "./components/empleado/empleado.component";
import { LoginComponent } from "./components/login/login.component";
import { BrowserModule } from "@angular/platform-browser";
import { AppRoutingModule } from "./app-routing.module";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { HTTP_INTERCEPTORS, HttpClientModule } from "@angular/common/http";
import { NgxPaginationModule } from "ngx-pagination";
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { ChartModule } from 'primeng/chart';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AuthInterceptor } from "./interceptors/auth.interceptor";

@NgModule({
  declarations: [
    AppComponent,
    BitacoraComponent,
    HerramientaComponent,
    DashboardComponent,
    EmpleadoComponent,
    LoginComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    NgxPaginationModule,
    DropdownModule,
    MultiSelectModule,
    ChartModule,
    BrowserAnimationsModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
