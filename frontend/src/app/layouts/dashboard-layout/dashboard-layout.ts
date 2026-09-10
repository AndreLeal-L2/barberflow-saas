import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideCalendarDays,
  LucideClock,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideMapPin,
  LucideScissors,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  imports: [
    LucideCalendarDays,
    LucideClock,
    LucideLayoutDashboard,
    LucideLogOut,
    LucideMapPin,
    LucideScissors,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './dashboard-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  readonly loggingOut = signal(false);
  readonly logoutError = signal<string | null>(null);
  readonly initials = computed(() => {
    const name = this.user()?.name ?? '';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  });

  logout(): void {
    if (this.loggingOut()) {
      return;
    }

    this.logoutError.set(null);
    this.loggingOut.set(true);
    this.authService
      .logout()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/login'),
        error: () => this.logoutError.set('Não foi possível terminar a sessão.'),
      });
  }
}
