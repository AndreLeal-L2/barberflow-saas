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
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then(
        (component) => component.ForgotPassword,
      ),
    title: 'Recuperar palavra-passe | BarberFlow',
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password').then((component) => component.ResetPassword),
    title: 'Nova palavra-passe | BarberFlow',
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/verify-email/verify-email').then((component) => component.VerifyEmail),
    title: 'Confirmar e-mail | BarberFlow',
  },
  {
    path: 'cancel-booking',
    loadComponent: () =>
      import('./pages/cancel-booking/cancel-booking').then(
        (component) => component.CancelBooking,
      ),
    title: 'Cancelar marcação | BarberFlow',
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/legal/legal').then((component) => component.Legal),
    data: { document: 'privacy' },
    title: 'Privacidade | BarberFlow',
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/legal/legal').then((component) => component.Legal),
    data: { document: 'terms' },
    title: 'Termos | BarberFlow',
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
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((component) => component.Dashboard),
        title: 'Visão geral | BarberFlow',
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./pages/bookings/bookings').then((component) => component.Bookings),
        title: 'Marcações | BarberFlow',
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./pages/services/services').then((component) => component.Services),
        title: 'Serviços | BarberFlow',
      },
      {
        path: 'availability',
        loadComponent: () =>
          import('./pages/availability/availability').then((component) => component.Availability),
        title: 'Horários | BarberFlow',
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile').then((component) => component.Profile),
        title: 'Página pública | BarberFlow',
      },
    ],
  },
  {
    path: 'b/:slug',
    loadComponent: () =>
      import('./pages/public-booking/public-booking').then((component) => component.PublicBooking),
    title: 'Marcação online | BarberFlow',
  },
  { path: '**', redirectTo: '' },
];
