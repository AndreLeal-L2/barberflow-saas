import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((component) => component.Home),
    title: 'Compasso | O seu negócio, ao seu ritmo',
  },
  {
    path: 'pricing',
    loadComponent: () => import('./pages/pricing/pricing').then((component) => component.Pricing),
    title: 'Preço | Compasso',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register').then((component) => component.Register),
    title: 'Criar conta | Compasso',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((component) => component.Login),
    title: 'Entrar | Compasso',
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then(
        (component) => component.ForgotPassword,
      ),
    title: 'Recuperar palavra-passe | Compasso',
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password').then((component) => component.ResetPassword),
    title: 'Nova palavra-passe | Compasso',
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/verify-email/verify-email').then((component) => component.VerifyEmail),
    title: 'Confirmar e-mail | Compasso',
  },
  {
    path: 'cancel-booking',
    loadComponent: () =>
      import('./pages/cancel-booking/cancel-booking').then((component) => component.CancelBooking),
    title: 'Cancelar marcação | Compasso',
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/legal/legal').then((component) => component.Legal),
    data: { document: 'privacy' },
    title: 'Privacidade | Compasso',
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/legal/legal').then((component) => component.Legal),
    data: { document: 'terms' },
    title: 'Termos | Compasso',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./layouts/dashboard-layout/dashboard-layout').then(
        (component) => component.DashboardLayout,
      ),
    children: [
      {
        path: '',
        data: { loadsBarbershop: true },
        loadComponent: () =>
          import('./pages/bookings/bookings').then((component) => component.Bookings),
        title: 'Agenda | Compasso',
      },
      {
        path: 'overview',
        data: { loadsBarbershop: true },
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((component) => component.Dashboard),
        title: 'Visão geral | Compasso',
      },
      {
        path: 'bookings',
        redirectTo: '',
        pathMatch: 'full',
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./pages/services/services').then((component) => component.Services),
        title: 'Serviços | Compasso',
      },
      {
        path: 'availability',
        loadComponent: () =>
          import('./pages/availability/availability').then((component) => component.Availability),
        title: 'Horários | Compasso',
      },
      {
        path: 'profile',
        data: { loadsBarbershop: true },
        loadComponent: () =>
          import('./pages/profile/profile').then((component) => component.Profile),
        title: 'Página pública | Compasso',
      },
    ],
  },
  {
    path: 'b/:slug',
    loadComponent: () =>
      import('./pages/public-booking/public-booking').then((component) => component.PublicBooking),
    title: 'Marcação online | Compasso',
  },
  { path: '**', redirectTo: '' },
];
