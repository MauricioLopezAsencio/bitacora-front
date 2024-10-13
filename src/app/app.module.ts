import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BitacoraComponent } from './components/bitacora/bitacora.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { HerramientaComponent } from './components/herramienta/herramienta.component';

@NgModule({
  declarations: [
    AppComponent,
    BitacoraComponent,
    HerramientaComponent,
    DashboardComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
