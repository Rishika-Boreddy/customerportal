import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CustomerProfileComponent } from './pages/customer-profile/customer-profile.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'CustomerProfile',component: CustomerProfileComponent},
  {
  path: 'profile',
  loadComponent: () =>
    import('./pages/customer-profile/customer-profile.component').then(m => m.CustomerProfileComponent),
  }

];
