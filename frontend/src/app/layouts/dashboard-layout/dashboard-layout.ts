import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideCalendarDays,
  LucideCopy,
  LucideClock,
  LucideExternalLink,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideMailCheck,
  LucideMapPin,
  LucideScissors,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { BookingApiService } from '../../core/booking-api.service';
import { ShopAppearanceService } from '../../core/shop-appearance.service';
import { AuthService } from '../../core/auth.service';
import { ThemeToggle } from '../../components/theme-toggle/theme-toggle';
import { LanguageSwitcher } from '../../components/language-switcher/language-switcher';
import { TranslatePipe } from '../../core/translate.pipe';

@Component({
  selector: 'app-dashboard-layout',
  imports: [
    LanguageSwitcher,
    TranslatePipe,
    ThemeToggle,
    LucideCalendarDays,
    LucideCopy,
    LucideClock,
    LucideExternalLink,
    LucideLayoutDashboard,
    LucideLogOut,
    LucideMailCheck,
    LucideMapPin,
    LucideScissors,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './dashboard-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayout implements OnInit, OnDestroy {
  readonly appearance = inject(ShopAppearanceService);
  private readonly api = inject(BookingApiService);
  private readonly route = inject(ActivatedRoute);
  ngOnInit(): void {
    if (!this.route.firstChild?.snapshot.data['loadsBarbershop']) {
      this.appearance.load(this.api.getBarbershop());
    }
  }
  ngOnDestroy(): void {
    this.appearance.clear();
  }
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly copied = signal(false);
  readonly copyError = signal(false);
  readonly publicUrl = computed(() => {
    const slug = this.user()?.barbershop.slug;
    return slug ? window.location.origin + '/b/' + slug : '';
  });

  async copyLink(): Promise<void> {
    this.copied.set(false);
    this.copyError.set(false);
    try {
      await navigator.clipboard.writeText(this.publicUrl());
      this.copied.set(true);
    } catch {
      this.copyError.set(true);
    }
  }

  readonly user = this.authService.user;
  readonly loggingOut = signal(false);
  readonly logoutError = signal<string | null>(null);
  readonly sendingVerification = signal(false);
  readonly verificationMessage = signal<string | null>(null);
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

  resendVerification(): void {
    if (this.sendingVerification()) {
      return;
    }
    this.verificationMessage.set(null);
    this.sendingVerification.set(true);
    this.authService
      .resendVerification()
      .pipe(finalize(() => this.sendingVerification.set(false)))
      .subscribe({
        next: (response) => this.verificationMessage.set(response.message),
        error: () => this.verificationMessage.set('Não foi possível enviar um novo link.'),
      });
  }
}
