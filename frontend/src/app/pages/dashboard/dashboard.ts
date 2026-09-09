import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideCalendarDays,
  LucideCircle,
  LucideCircleCheck,
  LucideCopy,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideScissors,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { SubscriptionStatus } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    LucideCalendarDays,
    LucideCircle,
    LucideCircleCheck,
    LucideCopy,
    LucideLayoutDashboard,
    LucideLogOut,
    LucideScissors,
    RouterLink,
  ],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  readonly loggingOut = signal(false);
  readonly copied = signal(false);
  readonly logoutError = signal<string | null>(null);

  readonly publicUrl = computed(() => {
    const slug = this.user()?.barbershop.slug;
    return slug ? `${window.location.origin}/b/${slug}` : '';
  });

  readonly initials = computed(() => {
    const name = this.user()?.name ?? '';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  });

  subscriptionLabel(status: SubscriptionStatus | undefined): string {
    const labels: Record<SubscriptionStatus, string> = {
      TRIALING: 'Período experimental',
      ACTIVE: 'Subscrição ativa',
      PAST_DUE: 'Pagamento pendente',
      CANCELLED: 'Subscrição cancelada',
    };
    return status ? labels[status] : '';
  }

  copyPublicUrl(): void {
    const url = this.publicUrl();
    if (!url) {
      return;
    }

    void navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      window.setTimeout(() => this.copied.set(false), 1800);
    });
  }

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
