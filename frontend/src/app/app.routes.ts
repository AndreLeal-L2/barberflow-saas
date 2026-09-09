import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((component) => component.Home),
    title: 'BarberFlow | Marcações para barbearias',
  },
  {
    path: 'pricing',
    loadComponent: () => import('./pages/pricing/pricing').then((component) => component.Pricing),
    title: 'Preço | BarberFlow',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register').then((component) => component.Register),
    title: 'Criar conta | BarberFlow',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((component) => component.Login),
    title: 'Entrar | BarberFlow',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((component) => component.Dashboard),
    title: 'Visão geral | BarberFlow',
  },
  { path: '**', redirectTo: '' },
];
